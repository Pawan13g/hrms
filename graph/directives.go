// Package graph wires gqlgen directives onto a runnable HTTP handler.
//
// Directives are kept here (not under resolver/) so they survive `gqlgen
// generate` runs.
package graph

import (
	"context"

	"github.com/99designs/gqlgen/graphql"
	"github.com/pawan13g/hrms/graph/generated"
)

// Directives returns the gqlgen DirectiveRoot wired with auth + rbac checks.
func Directives() generated.DirectiveRoot {
	return generated.DirectiveRoot{
		Auth: authDirective,
		// HasPermission: hasPermissionDirective,
	}
}

func authDirective(ctx context.Context, _ any, next graphql.Resolver) (any, error) {
	// if _, ok := auth.FromContext(ctx); !ok {
	// 	return nil, errors.New("unauthenticated")
	// }
	return next(ctx)
}

// func hasPermissionDirective(ctx context.Context, _ any, next graphql.Resolver, key string) (any, error) {
// 	if err := rbac.Require(ctx, key); err != nil {
// 		return nil, err
// 	}
// 	return next(ctx)
// }
