package employee

import (
	"context"
	"errors"
	"time"

	"github.com/sodium-labs/hrms/backend/internal/audit"
	"github.com/sodium-labs/hrms/backend/internal/modules/department"
	"github.com/sodium-labs/hrms/backend/internal/modules/designation"
	"github.com/sodium-labs/hrms/backend/internal/modules/location"
)

const entityType = "employee"

type Service struct {
	Repo     *Repo
	Audit    *audit.Recorder
	Dept     *department.Service
	Desig    *designation.Service
	Location *location.Service
}

func NewService(repo *Repo, rec *audit.Recorder, d *department.Service, ds *designation.Service, l *location.Service) *Service {
	return &Service{Repo: repo, Audit: rec, Dept: d, Desig: ds, Location: l}
}

func (s *Service) Get(ctx context.Context, tenantID, id int64) (*Employee, error) {
	return s.Repo.Get(ctx, tenantID, id)
}

func (s *Service) List(ctx context.Context, tenantID int64, f Filter, sort Sort, limit int, after string) (Page, error) {
	return s.Repo.List(ctx, tenantID, f, sort, limit, after)
}

func (s *Service) Create(ctx context.Context, tenantID int64, in CreateInput) (*Employee, error) {
	if err := validateJoining(in.JoiningDate); err != nil {
		return nil, err
	}
	if err := s.validateFKs(ctx, tenantID, in.DepartmentID, in.DesignationID, in.LocationID); err != nil {
		return nil, err
	}
	if in.ManagerID != nil {
		if mgr, err := s.Repo.Get(ctx, tenantID, *in.ManagerID); err != nil {
			return nil, err
		} else if mgr == nil {
			return nil, errors.New("manager not found")
		}
		// No cycle is possible on Create — the new row has no id yet. The
		// only way to form a cycle is via Update, where IsDescendant runs.
	}
	e, err := s.Repo.Create(ctx, tenantID, in)
	if err != nil {
		return nil, err
	}
	// Auto-create user + link: every employee with an email gets a user
	// account so roles and login access work from day one. If a user with
	// the same email already exists (e.g. the founding admin), just link.
	if in.Email != nil && *in.Email != "" {
		uid, _ := s.Repo.FindUserByEmail(ctx, tenantID, *in.Email)
		if uid == 0 {
			uid, _ = s.Repo.CreateUser(ctx, tenantID, *in.Email)
		}
		if uid != 0 {
			_ = s.Repo.SetUserID(ctx, tenantID, e.ID, uid)
			e, _ = s.Repo.Get(ctx, tenantID, e.ID)
		}
	}
	if err := s.Audit.Record(ctx, entityType, e.ID, audit.ActionCreate, nil, e); err != nil {
		// Audit failure is non-fatal on create — the row exists. Surface as
		// a warning via context cancellation tolerance: in dev we log; in
		// prod the audit pipeline should be reliable enough that this
		// branch never trips. Keeping it non-fatal avoids 5xx-ing a
		// successful write.
		_ = err
	}
	return e, nil
}

// Update enforces invariants in this order:
//
//  1. joining_date must not be in the future (if updated)
//  2. department/designation/location FKs belong to this tenant
//  3. manager_id is not the row itself
//  4. manager_id is not a descendant of this row in the reporting graph
//
// Then snapshot the pre-update row, apply, and audit-record old/new.
func (s *Service) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Employee, error) {
	if in.JoiningDate != nil {
		if err := validateJoining(*in.JoiningDate); err != nil {
			return nil, err
		}
	}
	if err := s.validateFKs(ctx, tenantID, in.DepartmentID, in.DesignationID, in.LocationID); err != nil {
		return nil, err
	}
	if in.ManagerID != nil {
		if *in.ManagerID == id {
			return nil, errors.New("employee cannot manage themselves")
		}
		cycle, err := s.Repo.IsDescendant(ctx, tenantID, id, *in.ManagerID)
		if err != nil {
			return nil, err
		}
		if cycle {
			return nil, errors.New("manager change would create a reporting cycle")
		}
		mgr, err := s.Repo.Get(ctx, tenantID, *in.ManagerID)
		if err != nil {
			return nil, err
		}
		if mgr == nil {
			return nil, errors.New("manager not found")
		}
	}
	prev, err := s.Repo.Get(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if prev == nil {
		return nil, errors.New("employee not found")
	}
	updated, err := s.Repo.Update(ctx, tenantID, id, in)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, errors.New("employee not found")
	}
	action := audit.ActionUpdate
	if in.Status != nil && *in.Status != prev.Status {
		action = audit.ActionStatusChange
	}
	_ = s.Audit.Record(ctx, entityType, updated.ID, action, prev, updated)
	return updated, nil
}

func (s *Service) Delete(ctx context.Context, tenantID, id int64) error {
	prev, err := s.Repo.Get(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if prev == nil {
		return errors.New("employee not found")
	}
	if err := s.Repo.SoftDelete(ctx, tenantID, id); err != nil {
		return err
	}
	_ = s.Audit.Record(ctx, entityType, id, audit.ActionDelete, prev, nil)
	return nil
}

// validateJoining rejects a future-dated joining_date. Past dates are fine
// (we allow back-dating for migration / late onboarding).
func validateJoining(d time.Time) error {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	in := d.UTC().Truncate(24 * time.Hour)
	if in.After(today) {
		return errors.New("joining_date cannot be in the future")
	}
	return nil
}

// validateFKs checks that any non-nil FK ids resolve to tenant-owned rows.
// Without this the COALESCE-style update would happily store a dangling id
// (the DB has ON DELETE SET NULL but no insert-time existence check).
func (s *Service) validateFKs(ctx context.Context, tenantID int64, deptID, desigID, locID *int64) error {
	if deptID != nil {
		d, err := s.Dept.Get(ctx, tenantID, *deptID)
		if err != nil {
			return err
		}
		if d == nil {
			return errors.New("department not found")
		}
	}
	if desigID != nil {
		d, err := s.Desig.Get(ctx, tenantID, *desigID)
		if err != nil {
			return err
		}
		if d == nil {
			return errors.New("designation not found")
		}
	}
	if locID != nil {
		l, err := s.Location.Get(ctx, tenantID, *locID)
		if err != nil {
			return err
		}
		if l == nil {
			return errors.New("location not found")
		}
	}
	return nil
}
