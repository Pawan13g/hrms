package location

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct{ Pool *pgxpool.Pool }

func NewRepo(p *pgxpool.Pool) *Repo { return &Repo{Pool: p} }

const selectCols = `id, tenant_id, name, address_line1, address_line2, country_id, state_id, city_id, pincode, timezone, status, created_at, updated_at`

func scan(row pgx.Row, l *Location) error {
	return row.Scan(
		&l.ID, &l.TenantID, &l.Name,
		&l.AddressLine1, &l.AddressLine2,
		&l.CountryID, &l.StateID, &l.CityID,
		&l.Pincode, &l.Timezone,
		&l.Status, &l.CreatedAt, &l.UpdatedAt,
	)
}

func (r *Repo) Get(ctx context.Context, tenantID, id int64) (*Location, error) {
	l := &Location{}
	err := scan(r.Pool.QueryRow(ctx, `
        SELECT `+selectCols+`
        FROM locations
        WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
    `, tenantID, id), l)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return l, nil
}

func (r *Repo) List(ctx context.Context, tenantID int64) ([]Location, error) {
	rows, err := r.Pool.Query(ctx, `
        SELECT `+selectCols+`
        FROM locations
        WHERE tenant_id = $1 AND status <> 'deleted'
        ORDER BY name
    `, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Location
	for rows.Next() {
		var l Location
		if err := scan(rows, &l); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (r *Repo) Create(ctx context.Context, tenantID int64, in CreateInput) (*Location, error) {
	var id int64
	if err := r.Pool.QueryRow(ctx, `
        INSERT INTO locations (
            tenant_id, name, address_line1, address_line2,
            country_id, state_id, city_id, pincode, timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
    `,
		tenantID, in.Name, in.AddressLine1, in.AddressLine2,
		in.CountryID, in.StateID, in.CityID, in.Pincode, in.Timezone,
	).Scan(&id); err != nil {
		return nil, err
	}
	return r.Get(ctx, tenantID, id)
}

func (r *Repo) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Location, error) {
	res, err := r.Pool.Exec(ctx, `
        UPDATE locations
        SET name          = COALESCE($3, name),
            address_line1 = COALESCE($4, address_line1),
            address_line2 = COALESCE($5, address_line2),
            country_id    = COALESCE($6, country_id),
            state_id      = COALESCE($7, state_id),
            city_id       = COALESCE($8, city_id),
            pincode       = COALESCE($9, pincode),
            timezone      = COALESCE($10, timezone),
            status        = COALESCE($11, status)
        WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
    `,
		tenantID, id,
		in.Name, in.AddressLine1, in.AddressLine2,
		in.CountryID, in.StateID, in.CityID, in.Pincode, in.Timezone,
		in.Status,
	)
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
        UPDATE locations
        SET status = 'deleted'
        WHERE tenant_id = $1 AND id = $2
    `, tenantID, id)
	return err
}
