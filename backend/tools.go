//go:build tools
// +build tools

// Package tools tracks build-time tools as Go module dependencies so that
// `go run <tool>` resolves to a pinned version. This file is never compiled
// into the server binary (the build tag excludes it).
package tools

import (
	_ "github.com/99designs/gqlgen"
)
