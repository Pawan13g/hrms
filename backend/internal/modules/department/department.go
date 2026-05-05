// Package department owns the org-tree CRUD for tenant-scoped departments.
//
// Business rules live in service.go; pure SQL access lives in repo.go.
package department

import "time"

type Department struct {
	ID        int64
	TenantID  int64
	Name      string
	Code      *string
	ParentID  *int64
	Status    string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type CreateInput struct {
	Name     string
	Code     *string
	ParentID *int64
}

// UpdateInput uses pointer fields to distinguish "client did not send" (nil →
// keep existing) from a literal zero value. Clearing a previously-set
// nullable column to NULL is not exposed yet — add a separate sentinel when a
// caller actually needs it.
type UpdateInput struct {
	Name     *string
	Code     *string
	ParentID *int64
	Status   *string
}
