// Package designation owns CRUD for tenant-scoped job titles, optionally
// linked to a department.
package designation

import "time"

type Designation struct {
	ID           int64
	TenantID     int64
	Title        string
	Level        *int32
	DepartmentID *int64
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type CreateInput struct {
	Title        string
	Level        *int32
	DepartmentID *int64
}

type UpdateInput struct {
	Title        *string
	Level        *int32
	DepartmentID *int64
	Status       *string
}
