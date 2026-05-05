package designation

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct{ Pool *pgxpool.Pool }

func NewRepo(p *pgxpool.Pool) *Repo { return &Repo{Pool: p} }

const selectCols = `id, tenant_id, title, level, department_id, status, created_at, updated_at`

func scan(row pgx.Row, d *Designation) error {
	return row.Scan(&d.ID, &d.TenantID, &d.Title, &d.Level, &d.DepartmentID, &d.Status, &d.CreatedAt, &d.UpdatedAt)
}

func (r *Repo) Get(ctx context.Context, tenantID, id int64) (*Designation, error) {
	d := &Designation{}
	err := scan(r.Pool.QueryRow(ctx, `
        SELECT `+selectCols+`
        FROM designations
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

func (r *Repo) List(ctx context.Context, tenantID int64) ([]Designation, error) {
	rows, err := r.Pool.Query(ctx, `
        SELECT `+selectCols+`
        FROM designations
        WHERE tenant_id = $1 AND status <> 'deleted'
        ORDER BY title
    `, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Designation
	for rows.Next() {
		var d Designation
		if err := scan(rows, &d); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *Repo) Create(ctx context.Context, tenantID int64, in CreateInput) (*Designation, error) {
	var id int64
	if err := r.Pool.QueryRow(ctx, `
        INSERT INTO designations (tenant_id, title, level, department_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `, tenantID, in.Title, in.Level, in.DepartmentID).Scan(&id); err != nil {
		return nil, err
	}
	return r.Get(ctx, tenantID, id)
}

func (r *Repo) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Designation, error) {
	res, err := r.Pool.Exec(ctx, `
        UPDATE designations
        SET title         = COALESCE($3, title),
            level         = COALESCE($4, level),
            department_id = COALESCE($5, department_id),
            status        = COALESCE($6, status)
        WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
    `, tenantID, id, in.Title, in.Level, in.DepartmentID, in.Status)
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
        UPDATE designations
        SET status = 'deleted'
        WHERE tenant_id = $1 AND id = $2
    `, tenantID, id)
	return err
}
