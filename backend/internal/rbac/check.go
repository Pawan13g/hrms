package rbac

import (
	"context"
	"errors"

	"github.com/sodium-labs/hrms/backend/internal/auth"
)

// ErrForbidden is returned when the principal lacks the required permission.
var ErrForbidden = errors.New("rbac: forbidden")

// ErrUnauthenticated is returned when there is no principal in context.
var ErrUnauthenticated = errors.New("rbac: unauthenticated")

// Require returns nil iff the ctx principal carries `key` in its permission set.
//
// Used by GraphQL directives and service-layer guards alike so the policy
// answer is the same in every entry path.
func Require(ctx context.Context, key string) error {
	p, ok := auth.FromContext(ctx)
	if !ok {
		return ErrUnauthenticated
	}
	if !p.HasPerm(key) {
		return ErrForbidden
	}
	return nil
}
