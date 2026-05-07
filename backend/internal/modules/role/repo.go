package role

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct{ Pool *pgxpool.Pool }

func NewRepo(p *pgxpool.Pool) *Repo { return &Repo{Pool: p} }

func (r *Repo) Get(ctx context.Context, tenantID, id int64) (*Role, error) {
	role := &Role{}
	err := r.Pool.QueryRow(ctx, `
		SELECT id, tenant_id, name, description, is_system, status, created_at
		FROM roles
		WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
	`, tenantID, id).Scan(
		&role.ID, &role.TenantID, &role.Name, &role.Description,
		&role.IsSystem, &role.Status, &role.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	perms, err := r.rolePermissions(ctx, id)
	if err != nil {
		return nil, err
	}
	role.Permissions = perms
	uc, err := r.userCount(ctx, id)
	if err != nil {
		return nil, err
	}
	role.UserCount = uc
	return role, nil
}

func (r *Repo) List(ctx context.Context, tenantID int64) ([]Role, error) {
	rows, err := r.Pool.Query(ctx, `
		SELECT r.id, r.tenant_id, r.name, r.description, r.is_system, r.status, r.created_at,
		       (SELECT count(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS perm_count,
		       (SELECT count(*) FROM user_roles ur WHERE ur.role_id = r.id) AS user_count
		FROM roles r
		WHERE r.tenant_id = $1 AND r.status <> 'deleted'
		ORDER BY r.is_system DESC, r.name
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Role
	for rows.Next() {
		var ro Role
		var permCount int
		if err := rows.Scan(
			&ro.ID, &ro.TenantID, &ro.Name, &ro.Description,
			&ro.IsSystem, &ro.Status, &ro.CreatedAt,
			&permCount, &ro.UserCount,
		); err != nil {
			return nil, err
		}
		out = append(out, ro)
	}
	return out, rows.Err()
}

func (r *Repo) Create(ctx context.Context, tenantID int64, in CreateInput) (*Role, error) {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var id int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO roles (tenant_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING id
	`, tenantID, in.Name, in.Description).Scan(&id); err != nil {
		return nil, err
	}

	if len(in.PermissionIDs) > 0 {
		for _, pid := range in.PermissionIDs {
			if _, err := tx.Exec(ctx, `
				INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
			`, id, pid); err != nil {
				return nil, err
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.Get(ctx, tenantID, id)
}

func (r *Repo) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Role, error) {
	res, err := r.Pool.Exec(ctx, `
		UPDATE roles
		SET name        = COALESCE($3, name),
		    description = COALESCE($4, description),
		    status      = COALESCE($5, status)
		WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
	`, tenantID, id, in.Name, in.Description, in.Status)
	if err != nil {
		return nil, err
	}
	if res.RowsAffected() == 0 {
		return nil, nil
	}
	return r.Get(ctx, tenantID, id)
}

func (r *Repo) SoftDelete(ctx context.Context, tenantID, id int64) error {
	_, err := r.Pool.Exec(ctx, `
		UPDATE roles SET status = 'deleted'
		WHERE tenant_id = $1 AND id = $2
	`, tenantID, id)
	return err
}

func (r *Repo) SetPermissions(ctx context.Context, roleID int64, permissionIDs []int64) error {
	tx, err := r.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM role_permissions WHERE role_id = $1`, roleID); err != nil {
		return err
	}
	for _, pid := range permissionIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
		`, roleID, pid); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *Repo) ListPermissions(ctx context.Context) ([]Permission, error) {
	rows, err := r.Pool.Query(ctx, `SELECT id, key, description FROM permissions ORDER BY key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Permission
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.Key, &p.Description); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repo) AssignUser(ctx context.Context, userID, roleID int64) error {
	_, err := r.Pool.Exec(ctx, `
		INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, userID, roleID)
	return err
}

func (r *Repo) RevokeUser(ctx context.Context, userID, roleID int64) error {
	_, err := r.Pool.Exec(ctx, `
		DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2
	`, userID, roleID)
	return err
}

func (r *Repo) UserRoles(ctx context.Context, userID int64) ([]UserRole, error) {
	rows, err := r.Pool.Query(ctx, `
		SELECT ur.user_id, ur.role_id, r.name
		FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1 AND r.status <> 'deleted'
		ORDER BY r.name
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserRole
	for rows.Next() {
		var ur UserRole
		if err := rows.Scan(&ur.UserID, &ur.RoleID, &ur.RoleName); err != nil {
			return nil, err
		}
		out = append(out, ur)
	}
	return out, rows.Err()
}

func (r *Repo) UsersWithRole(ctx context.Context, tenantID, roleID int64) ([]RoleUser, error) {
	rows, err := r.Pool.Query(ctx, `
		SELECT u.id, u.email
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id
		WHERE ur.role_id = $1 AND u.tenant_id = $2 AND u.status = 'active'
		ORDER BY u.email
	`, roleID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []RoleUser
	for rows.Next() {
		var ru RoleUser
		if err := rows.Scan(&ru.UserID, &ru.Email); err != nil {
			return nil, err
		}
		out = append(out, ru)
	}
	return out, rows.Err()
}

// --- helpers ---

func (r *Repo) rolePermissions(ctx context.Context, roleID int64) ([]Permission, error) {
	rows, err := r.Pool.Query(ctx, `
		SELECT p.id, p.key, p.description
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		WHERE rp.role_id = $1
		ORDER BY p.key
	`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Permission
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.Key, &p.Description); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repo) userCount(ctx context.Context, roleID int64) (int, error) {
	var n int
	err := r.Pool.QueryRow(ctx, `SELECT count(*) FROM user_roles WHERE role_id = $1`, roleID).Scan(&n)
	return n, err
}
