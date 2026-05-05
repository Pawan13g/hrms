package graph

import (
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"

	"github.com/sodium-labs/hrms/backend/internal/graph/generated"
	"github.com/sodium-labs/hrms/backend/internal/graph/resolver"
)

// NewHandler returns the GraphQL HTTP handler with sensible defaults
// (POST + GET transports, introspection, persisted-query LRU).
func NewHandler(r *resolver.Resolver) http.Handler {
	cfg := generated.Config{
		Resolvers:  r,
		Directives: Directives(),
	}
	srv := handler.New(generated.NewExecutableSchema(cfg))
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.GET{})
	srv.Use(extension.Introspection{})
	srv.Use(extension.AutomaticPersistedQuery{Cache: lru.New(100)})
	return srv
}

// Playground returns the gqlgen playground HTML page bound to graphqlPath.
func Playground(graphqlPath string) http.Handler {
	return playground.Handler("HRMS GraphQL", graphqlPath)
}
