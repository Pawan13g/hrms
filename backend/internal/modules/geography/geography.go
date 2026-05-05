// Package geography is the read-only catalog of countries, states, and
// cities. Rows are tenant-agnostic seed data; writes are migration-only for
// now. Surfaced to the frontend so location/employee forms can drive
// dependent dropdowns.
package geography

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Country struct {
	ID      int64
	Name    string
	ISOCode *string
	Status  string
}

type State struct {
	ID        int64
	CountryID *int64
	Name      string
}

type City struct {
	ID      int64
	StateID *int64
	Name    string
}

type Repo struct{ Pool *pgxpool.Pool }

func NewRepo(p *pgxpool.Pool) *Repo { return &Repo{Pool: p} }

func (r *Repo) ListCountries(ctx context.Context) ([]Country, error) {
	rows, err := r.Pool.Query(ctx, `
        SELECT id, name, iso_code, status
        FROM countries
        WHERE status = 'active'
        ORDER BY name
    `)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Country
	for rows.Next() {
		var c Country
		if err := rows.Scan(&c.ID, &c.Name, &c.ISOCode, &c.Status); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *Repo) ListStates(ctx context.Context, countryID int64) ([]State, error) {
	rows, err := r.Pool.Query(ctx, `
        SELECT id, country_id, name
        FROM states
        WHERE country_id = $1
        ORDER BY name
    `, countryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []State
	for rows.Next() {
		var s State
		if err := rows.Scan(&s.ID, &s.CountryID, &s.Name); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *Repo) ListCities(ctx context.Context, stateID int64) ([]City, error) {
	rows, err := r.Pool.Query(ctx, `
        SELECT id, state_id, name
        FROM cities
        WHERE state_id = $1
        ORDER BY name
    `, stateID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []City
	for rows.Next() {
		var c City
		if err := rows.Scan(&c.ID, &c.StateID, &c.Name); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *Repo) GetCountry(ctx context.Context, id int64) (*Country, error) {
	c := &Country{}
	err := r.Pool.QueryRow(ctx, `
        SELECT id, name, iso_code, status
        FROM countries
        WHERE id = $1
    `, id).Scan(&c.ID, &c.Name, &c.ISOCode, &c.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return c, err
}
