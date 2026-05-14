package context

import (
	"context"

	"github.com/pawan13g/hrms/graph/model"
)

type ctxKey struct{}

func WithPrincipal(ctx context.Context, u *model.AuthUser) context.Context {
	return context.WithValue(ctx, ctxKey{}, u)
}
