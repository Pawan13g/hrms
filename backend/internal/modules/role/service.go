package role

import (
	"context"
	"errors"
)

type Service struct{ Repo *Repo }

func NewService(r *Repo) *Service { return &Service{Repo: r} }

func (s *Service) Get(ctx context.Context, tenantID, id int64) (*Role, error) {
	return s.Repo.Get(ctx, tenantID, id)
}

func (s *Service) List(ctx context.Context, tenantID int64) ([]Role, error) {
	return s.Repo.List(ctx, tenantID)
}

func (s *Service) Create(ctx context.Context, tenantID int64, in CreateInput) (*Role, error) {
	return s.Repo.Create(ctx, tenantID, in)
}

func (s *Service) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Role, error) {
	r, err := s.Repo.Get(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return nil, errors.New("role not found")
	}
	if r.IsSystem {
		if in.Name != nil {
			return nil, errors.New("cannot rename a system role")
		}
		if in.Status != nil && *in.Status != r.Status {
			return nil, errors.New("cannot change status of a system role")
		}
	}
	return s.Repo.Update(ctx, tenantID, id, in)
}

func (s *Service) Delete(ctx context.Context, tenantID, id int64) error {
	r, err := s.Repo.Get(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if r == nil {
		return errors.New("role not found")
	}
	if r.IsSystem {
		return errors.New("cannot delete a system role")
	}
	return s.Repo.SoftDelete(ctx, tenantID, id)
}

func (s *Service) SetPermissions(ctx context.Context, tenantID, roleID int64, permissionIDs []int64) (*Role, error) {
	r, err := s.Repo.Get(ctx, tenantID, roleID)
	if err != nil {
		return nil, err
	}
	if r == nil {
		return nil, errors.New("role not found")
	}
	if r.IsSystem {
		// For system Admin roles, ensure rbac.manage stays present.
		allPerms, err := s.Repo.ListPermissions(ctx)
		if err != nil {
			return nil, err
		}
		var rbacManageID int64
		for _, p := range allPerms {
			if p.Key == "rbac.manage" {
				rbacManageID = p.ID
				break
			}
		}
		if rbacManageID != 0 {
			found := false
			for _, pid := range permissionIDs {
				if pid == rbacManageID {
					found = true
					break
				}
			}
			if !found {
				return nil, errors.New("cannot remove rbac.manage from a system role")
			}
		}
	}
	if err := s.Repo.SetPermissions(ctx, roleID, permissionIDs); err != nil {
		return nil, err
	}
	return s.Repo.Get(ctx, tenantID, roleID)
}

func (s *Service) ListPermissions(ctx context.Context) ([]Permission, error) {
	return s.Repo.ListPermissions(ctx)
}

func (s *Service) AssignUser(ctx context.Context, userID, roleID int64) error {
	return s.Repo.AssignUser(ctx, userID, roleID)
}

// RevokeUser removes a role from a user. callerUserID is the authenticated
// user performing the action — used to prevent self-revocation of system roles.
func (s *Service) RevokeUser(ctx context.Context, tenantID, callerUserID, userID, roleID int64) error {
	r, err := s.Repo.Get(ctx, tenantID, roleID)
	if err != nil {
		return err
	}
	if r == nil {
		return errors.New("role not found")
	}
	if r.IsSystem && callerUserID == userID {
		return errors.New("cannot revoke your own system admin role")
	}
	return s.Repo.RevokeUser(ctx, userID, roleID)
}

func (s *Service) UserRoles(ctx context.Context, userID int64) ([]UserRole, error) {
	return s.Repo.UserRoles(ctx, userID)
}

func (s *Service) UsersWithRole(ctx context.Context, tenantID, roleID int64) ([]RoleUser, error) {
	return s.Repo.UsersWithRole(ctx, tenantID, roleID)
}
