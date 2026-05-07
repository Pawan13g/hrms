package resolver

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/sodium-labs/hrms/backend/internal/auth"
	"github.com/sodium-labs/hrms/backend/internal/graph/model"
	"github.com/sodium-labs/hrms/backend/internal/modules/department"
	"github.com/sodium-labs/hrms/backend/internal/modules/designation"
	"github.com/sodium-labs/hrms/backend/internal/modules/employee"
	"github.com/sodium-labs/hrms/backend/internal/modules/geography"
	"github.com/sodium-labs/hrms/backend/internal/modules/location"
	"github.com/sodium-labs/hrms/backend/internal/modules/role"
)

// errNoTenant is returned when a resolver runs without a Principal in ctx.
// The @auth directive should have caught this earlier; we keep the guard in
// case a query field forgets to apply @auth.
var errNoTenant = errors.New("unauthenticated")

func tenantOf(ctx context.Context) (int64, error) {
	p, ok := auth.FromContext(ctx)
	if !ok {
		return 0, errNoTenant
	}
	return p.TenantID, nil
}

func idStr(n int64) string                 { return strconv.FormatInt(n, 10) }
func parseID(s string) (int64, error)      { return strconv.ParseInt(s, 10, 64) }
func unixSecs(t interface{ Unix() int64 }) int { return int(t.Unix()) }

// pIDStr lifts a *int64 db id into a *string GraphQL ID.
func pIDStr(p *int64) *string {
	if p == nil {
		return nil
	}
	s := idStr(*p)
	return &s
}

// pIDFromStr lowers an optional GraphQL ID into a *int64 for the service
// layer. A nil input passes through (no update / no constraint).
func pIDFromStr(p *string) (*int64, error) {
	if p == nil {
		return nil, nil
	}
	n, err := parseID(*p)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

// intToInt32Ptr widens a *int (gqlgen) into a *int32 (DB column type).
func intToInt32Ptr(p *int) *int32 {
	if p == nil {
		return nil
	}
	v := int32(*p)
	return &v
}

func int32ToIntPtr(p *int32) *int {
	if p == nil {
		return nil
	}
	v := int(*p)
	return &v
}

// ---------- Department ----------

func toGQLDepartment(d *department.Department) *model.Department {
	if d == nil {
		return nil
	}
	return &model.Department{
		ID:        idStr(d.ID),
		Name:      d.Name,
		Code:      d.Code,
		ParentID:  pIDStr(d.ParentID),
		Status:    d.Status,
		CreatedAt: unixSecs(d.CreatedAt),
		UpdatedAt: unixSecs(d.UpdatedAt),
	}
}

// ---------- Designation ----------

func toGQLDesignation(d *designation.Designation) *model.Designation {
	if d == nil {
		return nil
	}
	return &model.Designation{
		ID:           idStr(d.ID),
		Title:        d.Title,
		Level:        int32ToIntPtr(d.Level),
		DepartmentID: pIDStr(d.DepartmentID),
		Status:       d.Status,
		CreatedAt:    unixSecs(d.CreatedAt),
		UpdatedAt:    unixSecs(d.UpdatedAt),
	}
}

// ---------- Location ----------

func toGQLLocation(l *location.Location) *model.Location {
	if l == nil {
		return nil
	}
	return &model.Location{
		ID:           idStr(l.ID),
		Name:         l.Name,
		AddressLine1: l.AddressLine1,
		AddressLine2: l.AddressLine2,
		CountryID:    pIDStr(l.CountryID),
		StateID:      pIDStr(l.StateID),
		CityID:       pIDStr(l.CityID),
		Pincode:      l.Pincode,
		Timezone:     l.Timezone,
		Status:       l.Status,
		CreatedAt:    unixSecs(l.CreatedAt),
		UpdatedAt:    unixSecs(l.UpdatedAt),
	}
}

// ---------- Geography ----------

func toGQLCountry(c geography.Country) *model.Country {
	return &model.Country{
		ID:      idStr(c.ID),
		Name:    c.Name,
		IsoCode: c.ISOCode,
	}
}

func toGQLState(s geography.State) *model.State {
	return &model.State{
		ID:        idStr(s.ID),
		CountryID: pIDStr(s.CountryID),
		Name:      s.Name,
	}
}

func toGQLCity(c geography.City) *model.City {
	return &model.City{
		ID:      idStr(c.ID),
		StateID: pIDStr(c.StateID),
		Name:    c.Name,
	}
}

// ---------- Employee ----------

const dateFormat = "2006-01-02"

// parseDate accepts the GraphQL ISO yyyy-mm-dd string and returns it as a
// midnight-UTC time.Time. Empty input is rejected (caller filters required
// fields); invalid input produces a clear error.
func parseDate(s string) (time.Time, error) {
	t, err := time.ParseInLocation(dateFormat, s, time.UTC)
	if err != nil {
		return time.Time{}, errors.New("invalid date (want yyyy-mm-dd): " + s)
	}
	return t, nil
}

func parseDatePtr(p *string) (*time.Time, error) {
	if p == nil || *p == "" {
		return nil, nil
	}
	t, err := parseDate(*p)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func formatDate(t time.Time) string { return t.UTC().Format(dateFormat) }
func formatDatePtr(p *time.Time) *string {
	if p == nil {
		return nil
	}
	s := formatDate(*p)
	return &s
}

// gqlSortToService maps the GraphQL EmployeeSort enum to the service Sort.
// Nil falls back to the default (created desc).
func gqlSortToService(s *model.EmployeeSort) employee.Sort {
	if s == nil {
		return employee.SortCreatedDesc
	}
	switch *s {
	case model.EmployeeSortCreatedAsc:
		return employee.SortCreatedAsc
	case model.EmployeeSortNameAsc:
		return employee.SortNameAsc
	case model.EmployeeSortNameDesc:
		return employee.SortNameDesc
	case model.EmployeeSortJoiningAsc:
		return employee.SortJoiningAsc
	case model.EmployeeSortJoiningDesc:
		return employee.SortJoiningDesc
	default:
		return employee.SortCreatedDesc
	}
}

// parseIDs converts a slice of GraphQL ID strings to int64s.
func parseIDs(ss []string) ([]int64, error) {
	out := make([]int64, 0, len(ss))
	for _, s := range ss {
		n, err := parseID(s)
		if err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, nil
}

// ---------- Role ----------

func toGQLRole(r *role.Role) *model.Role {
	if r == nil {
		return nil
	}
	perms := make([]*model.RolePermission, len(r.Permissions))
	for i := range r.Permissions {
		perms[i] = toGQLPermission(&r.Permissions[i])
	}
	return &model.Role{
		ID:          idStr(r.ID),
		Name:        r.Name,
		Description: r.Description,
		IsSystem:    r.IsSystem,
		Status:      r.Status,
		Permissions: perms,
		UserCount:   r.UserCount,
		CreatedAt:   unixSecs(r.CreatedAt),
	}
}

func toGQLPermission(p *role.Permission) *model.RolePermission {
	if p == nil {
		return nil
	}
	var desc *string
	if p.Description != nil {
		desc = p.Description
	}
	return &model.RolePermission{
		ID:          idStr(p.ID),
		Key:         p.Key,
		Description: desc,
	}
}

// ---------- Employee ----------

func toGQLEmployee(e *employee.Employee) *model.Employee {
	if e == nil {
		return nil
	}
	return &model.Employee{
		ID:             idStr(e.ID),
		EmployeeCode:   e.EmployeeCode,
		FirstName:      e.FirstName,
		LastName:       e.LastName,
		Email:          e.Email,
		Phone:          e.Phone,
		DateOfBirth:    formatDatePtr(e.DateOfBirth),
		Gender:         e.Gender,
		JoiningDate:    formatDate(e.JoiningDate),
		EmploymentType: e.EmploymentType,
		DepartmentID:   pIDStr(e.DepartmentID),
		DesignationID: pIDStr(e.DesignationID),
		LocationID:    pIDStr(e.LocationID),
		ManagerID:     pIDStr(e.ManagerID),
		UserID:        pIDStr(e.UserID),
		Status:        e.Status,
		CreatedAt:     unixSecs(e.CreatedAt),
		UpdatedAt:     unixSecs(e.UpdatedAt),
	}
}

