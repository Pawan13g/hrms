package server

import (
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-gonic/gin"
	"github.com/pawan13g/hrms/configs"
	"github.com/pawan13g/hrms/graph"
	"github.com/pawan13g/hrms/graph/generated"
	"github.com/pawan13g/hrms/graph/resolver"
	"github.com/pawan13g/hrms/internal/core/container"
	"github.com/pawan13g/hrms/internal/core/middleware"
	"github.com/pawan13g/hrms/internal/modules/auth/util/jwt"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"github.com/vektah/gqlparser/v2/ast"
	"gorm.io/gorm"
)

type Deps struct {
	Cfg       *configs.Config
	PG        *gorm.DB
	Redis     *redis.Client
	Issuer    *jwt.Issuer
	Container *container.Container
}

func New(d Deps) *gin.Engine {
	r := gin.New()

	middleware.RegisterAppMiddleware(r)
	middleware.RegisterRequestMiddleware(r, d.Cfg)

	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/readyz", func(c *gin.Context) {

		sqlDB, err := d.PG.DB()

		if err != nil {
			log.Fatal().Err(err).Msg("database connection failed")

		}

		if err := sqlDB.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"pg": err.Error()})
			return
		}

		if err := d.Redis.Ping(c).Err(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"redis": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	gqlHandler := InitGraphHandler(&resolver.Resolver{AuthService: d.Container.AuthService}, d.PG)
	r.Use(d.Container.AuthMiddleware.AuthMiddleware())
	r.Any("/graphql", gin.WrapH(gqlHandler))
	r.GET("/playground", gin.WrapH(Playground("/graphql")))
	return r
}

func InitGraphHandler(r *resolver.Resolver, db *gorm.DB) http.Handler {
	cfg := generated.Config{
		Resolvers:  r,
		Directives: graph.Directives(),
	}
	srv := handler.New(generated.NewExecutableSchema(cfg))

	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})

	srv.SetQueryCache(lru.New[*ast.QueryDocument](1000))
	srv.Use(extension.Introspection{})
	srv.Use(extension.AutomaticPersistedQuery{Cache: lru.New[string](100)})
	return srv
}

func Playground(graphqlPath string) http.Handler {
	return playground.ApolloSandboxHandler("HRMS GraphQL", graphqlPath)
}
