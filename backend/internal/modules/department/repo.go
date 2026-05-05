package department

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct{ Pool *pgxpool.Pool }

func NewRepo(p *pgxpool.Pool) *Repo { return &Repo{Pool: p} }

const selectCols = `id, tenant_id, name, code, parent_id, status, created_at, updated_at`

func scan(row pgx.Row, d *Department) error {
	return row.Scan(&d.ID, &d.TenantID, &d.Name, &d.Code, &d.ParentID, &d.Status, &d.CreatedAt, &d.UpdatedAt)
}

func (r *Repo) Get(ctx context.Context, tenantID, id int64) (*Department, error) {
	d := &Department{}
	err := scan(r.Pool.QueryRow(ctx, `
        SELECT `+selectCols+`
        FROM departments
        WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
    `, tenantID, id), d)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return d, nil
}

func (r *Repo) List(ctx context.Context, tenantID int64) ([]Department, error) {
	rows, err := r.Pool.Query(ctx, `
        SELECT `+selectCols+`
        FROM departments
        WHERE tenant_id = $1 AND status <> 'deleted'
        ORDER BY name
    `, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Department
	for rows.Next() {
		var d Department
		if err := scan(rows, &d); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *Repo) Create(ctx context.Context, tenantID int64, in CreateInput) (*Department, error) {
	var id int64
	if err := r.Pool.QueryRow(ctx, `
        INSERT INTO departments (tenant_id, name, code, parent_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `, tenantID, in.Name, in.Code, in.ParentID).Scan(&id); err != nil {
		return nil, err
	}
	return r.Get(ctx, tenantID, id)
}

// Update applies COALESCE-style partial updates: nil pointers leave the
// existing value untouched. Returns nil if the row was missing or already
// soft-deleted.
func (r *Repo) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Department, error) {
	res, err := r.Pool.Exec(ctx, `
        UPDATE departments
        SET name      = COALESCE($3, name),
            code      = COALESCE($4, code),
            parent_id = COALESCE($5, parent_id),
            status    = COALESCE($6, status)
        WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
    `, tenantID, id, in.Name, in.Code, in.ParentID, in.Status)
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
        UPDATE departments
        SET status = 'deleted'
        WHERE tenant_id = $1 AND id = $2
    `, tenantID, id)
	return err
}

// IsDescendant reports whether candidateID lives anywhere in the subtree
// rooted at rootID (inclusive of rootID itself). The service uses this to
// reject parent_id changes that would close a cycle in the parent graph.
func (r *Repo) IsDescendant(ctx context.Context, tenantID, rootID, candidateID int64) (bool, error) {
	var exists bool
	err := r.Pool.QueryRow(ctx, `
        WITH RECURSIVE sub AS (
            SELECT id FROM departments WHERE tenant_id = $1 AND id = $2
            UNION
            SELECT d.id FROM departments d
            JOIN sub ON d.parent_id = sub.id
            WHERE d.tenant_id = $1
        )
        SELECT EXISTS (SELECT 1 FROM sub WHERE id = $3)
    `, tenantID, rootID, candidateID).Scan(&exists)
	return exists, err
}
