// Package migrations exposes the SQL migration files as an embedded fs.FS so
// the server binary is self-contained.
package migrations

import (
	"embed"
	"io/fs"
)

//go:embed *.sql
var raw embed.FS

// FS returns the migration files as a flat fs.FS rooted at this directory.
func FS() fs.FS { return raw }
