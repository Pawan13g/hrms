package designation

import (
	"context"
	"errors"

	"github.com/sodium-labs/hrms/backend/internal/modules/department"
)

type Service struct {
	Repo *Repo
	Dept *department.Service
}

func NewService(r *Repo, d *department.Service) *Service {
	return &Service{Repo: r, Dept: d}
}

func (s *Service) Get(ctx context.Context, tenantID, id int64) (*Designation, error) {
	return s.Repo.Get(ctx, tenantID, id)
}

func (s *Service) List(ctx context.Context, tenantID int64) ([]Designation, error) {
	return s.Repo.List(ctx, tenantID)
}

func (s *Service) Create(ctx context.Context, tenantID int64, in CreateInput) (*Designation, error) {
	if err := s.validateDept(ctx, tenantID, in.DepartmentID); err != nil {
		return nil, err
	}
	return s.Repo.Create(ctx, tenantID, in)
}

func (s *Service) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Designation, error) {
	if err := s.validateDept(ctx, tenantID, in.DepartmentID); err != nil {
		return nil, err
	}
	return s.Repo.Update(ctx, tenantID, id, in)
}

func (s *Service) Delete(ctx context.Context, tenantID, id int64) error {
	return s.Repo.SoftDelete(ctx, tenantID, id)
}

// validateDept rejects cross-tenant or stale department references. The DB
// has ON DELETE SET NULL so a missing department wouldn't FK-fail, but we
// want a clean 4xx before the row gets created with a dangling pointer.
func (s *Service) validateDept(ctx context.Context, tenantID int64, deptID *int64) error {
	if deptID == nil {
		return nil
	}
	d, err := s.Dept.Get(ctx, tenantID, *deptID)
	if err != nil {
		return err
	}
	if d == nil {
		return errors.New("department not found")
	}
	return nil
}
