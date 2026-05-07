// Package employee owns the canonical employee record plus directory listing
// and the manager-graph guard rails. Audit log writes happen in service.go,
// not the repo, so that future imports can bypass auditing intentionally if
// we ever expose a bulk path.
package employee

import "time"

type Employee struct {
	ID             int64
	TenantID       int64
	EmployeeCode   string
	FirstName      *string
	LastName       *string
	Email          *string
	Phone          *string
	DateOfBirth    *time.Time
	Gender         *string
	JoiningDate    time.Time
	EmploymentType *string
	DepartmentID   *int64
	DesignationID  *int64
	LocationID     *int64
	ManagerID      *int64
	UserID         *int64
	Status         string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type CreateInput struct {
	EmployeeCode   string
	FirstName      *string
	LastName       *string
	Email          *string
	Phone          *string
	DateOfBirth    *time.Time
	Gender         *string
	JoiningDate    time.Time
	EmploymentType *string
	DepartmentID   *int64
	DesignationID  *int64
	LocationID     *int64
	ManagerID      *int64
}

type UpdateInput struct {
	EmployeeCode   *string
	FirstName      *string
	LastName       *string
	Email          *string
	Phone          *string
	DateOfBirth    *time.Time
	Gender         *string
	JoiningDate    *time.Time
	EmploymentType *string
	DepartmentID   *int64
	DesignationID  *int64
	LocationID     *int64
	ManagerID      *int64
	Status         *string
}

// Filter is the optional set of WHERE clauses applied to the directory list.
// All fields are AND-ed together; nil pointers are treated as no constraint.
type Filter struct {
	Search        *string
	Status        *string
	DepartmentID  *int64
	DesignationID *int64
	LocationID    *int64
	ManagerID     *int64
}

// Sort enumerates the supported orderings. Each value also implies a cursor
// shape; see cursor.go for details.
type Sort int

const (
	SortCreatedDesc Sort = iota
	SortCreatedAsc
	SortNameAsc
	SortNameDesc
	SortJoiningDesc
	SortJoiningAsc
)

// Page is the materialized result of a directory query, ready to project
// into a Relay-style connection by the resolver.
type Page struct {
	Items       []Employee
	HasNext     bool
	HasPrev     bool
	StartCursor string
	EndCursor   string
	TotalCount  int
}
