// Package location owns CRUD for tenant-scoped office locations. The
// `timezone` column is the per-location IANA tz name, surfaced to the
// frontend at render time only (timestamps remain UTC end-to-end).
package location

import "time"

type Location struct {
	ID           int64
	TenantID     int64
	Name         string
	AddressLine1 *string
	AddressLine2 *string
	CountryID    *int64
	StateID      *int64
	CityID       *int64
	Pincode      *string
	Timezone     *string
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CreateInput struct {
	Name         string
	AddressLine1 *string
	AddressLine2 *string
	CountryID    *int64
	StateID      *int64
	CityID       *int64
	Pincode      *string
	Timezone     *string
}

type UpdateInput struct {
	Name         *string
	AddressLine1 *string
	AddressLine2 *string
	CountryID    *int64
	StateID      *int64
	CityID       *int64
	Pincode      *string
	Timezone     *string
	Status       *string
}
