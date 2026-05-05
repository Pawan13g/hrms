package rbac_test

import (
	"context"
	"errors"
	"testing"

	"github.com/sodium-labs/hrms/backend/internal/auth"
	"github.com/sodium-labs/hrms/backend/internal/rbac"
)

func TestRequire(t *testing.T) {
	t.Run("no principal -> unauthenticated", func(t *testing.T) {
		err := rbac.Require(context.Background(), "employee.read")
		if !errors.Is(err, rbac.ErrUnauthenticated) {
			t.Fatalf("expected ErrUnauthenticated, got %v", err)
		}
	})

	t.Run("missing perm -> forbidden", func(t *testing.T) {
		p := &auth.Principal{Perms: map[string]struct{}{"audit.read": {}}}
		ctx := auth.WithPrincipal(context.Background(), p)
		err := rbac.Require(ctx, "employee.write")
		if !errors.Is(err, rbac.ErrForbidden) {
			t.Fatalf("expected ErrForbidden, got %v", err)
		}
	})

	t.Run("present perm -> nil", func(t *testing.T) {
		p := &auth.Principal{Perms: map[string]struct{}{"employee.read": {}}}
		ctx := auth.WithPrincipal(context.Background(), p)
		if err := rbac.Require(ctx, "employee.read"); err != nil {
			t.Fatalf("expected nil, got %v", err)
		}
	})
}

func TestKeysIncludesEmployeeRead(t *testing.T) {
	keys := rbac.Keys()
	want := map[string]bool{
		"employee.read":     false,
		"employee.write":    false,
		"employee.delete":   false,
		"org.write":         false,
		"customfield.write": false,
		"audit.read":        false,
	}
	for _, k := range keys {
		if _, ok := want[k]; ok {
			want[k] = true
		}
	}
	for k, present := range want {
		if !present {
			t.Errorf("registry missing %q", k)
		}
	}
}
