package department

import (
	"context"
	"errors"
)

type Service struct{ Repo *Repo }

func NewService(r *Repo) *Service { return &Service{Repo: r} }

func (s *Service) Get(ctx context.Context, tenantID, id int64) (*Department, error) {
	return s.Repo.Get(ctx, tenantID, id)
}

func (s *Service) List(ctx context.Context, tenantID int64) ([]Department, error) {
	return s.Repo.List(ctx, tenantID)
}

func (s *Service) Create(ctx context.Context, tenantID int64, in CreateInput) (*Department, error) {
	if in.ParentID != nil {
		parent, err := s.Repo.Get(ctx, tenantID, *in.ParentID)
		if err != nil {
			return nil, err
		}
		if parent == nil {
			return nil, errors.New("parent department not found")
		}
	}
	return s.Repo.Create(ctx, tenantID, in)
}

// Update enforces two parent-graph invariants before delegating to the repo:
//
//  1. self-loop: a row cannot be its own parent.
//  2. cycles: the proposed parent must not be a descendant of this row.
//
// Both checks ride on top of the repo's tenant filter, so a malicious
// cross-tenant id silently fails as "not in subtree" and proceeds — the
// follow-up parent-existence check would have caught it, but for now we
// short-circuit before that. M5 RLS adds another layer.
func (s *Service) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Department, error) {
	if in.ParentID != nil {
		if *in.ParentID == id {
			return nil, errors.New("department cannot be its own parent")
		}
		cycle, err := s.Repo.IsDescendant(ctx, tenantID, id, *in.ParentID)
		if err != nil {
			return nil, err
		}
		if cycle {
			return nil, errors.New("parent change would create a cycle")
		}
		parent, err := s.Repo.Get(ctx, tenantID, *in.ParentID)
		if err != nil {
			return nil, err
		}
		if parent == nil {
			return nil, errors.New("parent department not found")
		}
	}
	return s.Repo.Update(ctx, tenantID, id, in)
}

func (s *Service) Delete(ctx context.Context, tenantID, id int64) error {
	return s.Repo.SoftDelete(ctx, tenantID, id)
}
