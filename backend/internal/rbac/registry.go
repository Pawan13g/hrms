// Package rbac is the source of truth for permission keys used by every
// resolver / service in the system.
//
// At startup, Seed() upserts every key in this registry into the permissions
// table. New permissions are added by appending to All — never remove or
// rename a key (mark as deprecated and stop using it instead) so existing
// role_permissions rows remain meaningful.
package rbac

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Permission is a single capability key plus a human description.
type Permission struct {
	Key         string
	Description string
}

// All is the canonical permission registry. Keep keys snake_dot.lowercase.
var All = []Permission{
	{Key: "employee.read", Description: "Read employee records and directory"},
	{Key: "employee.write", Description: "Create or update employee records"},
	{Key: "employee.delete", Description: "Soft-delete employee records"},
	{Key: "org.write", Description: "Create or update org structure (departments, designations, locations)"},
	{Key: "customfield.write", Description: "Manage custom forms, fields, options"},
	{Key: "audit.read", Description: "View audit log entries"},
}

// Keys returns just the permission key strings.
func Keys() []string {
	out := make([]string, len(All))
	for i, p := range All {
		out[i] = p.Key
	}
	return out
}

// Seed upserts every Permission in All into the permissions table. Idempotent.
func Seed(ctx context.Context, pool *pgxpool.Pool) error {
	for _, p := range All {
		_, err := pool.Exec(ctx, `
            INSERT INTO permissions (key, description)
            VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description
        `, p.Key, p.Description)
		if err != nil {
			return err
		}
	}
	return nil
}
