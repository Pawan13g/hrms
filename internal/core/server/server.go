package server

import (
	"net/http"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pawan_13g/hrms/configs"
	"github.com/pawan_13g/hrms/graph"
	"github.com/pawan_13g/hrms/graph/generated"
	"github.com/pawan_13g/hrms/graph/resolver"
	"github.com/pawan_13g/hrms/internal/core/auth"
	"github.com/pawan_13g/hrms/internal/modules/masters/department"
	"github.com/pawan_13g/hrms/internal/modules/masters/geography"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"github.com/vektah/gqlparser/v2/ast"
	"gorm.io/gorm"
)

type Deps struct {
	Cfg    *configs.Config
	PG     *gorm.DB
	Redis  *redis.Client
	Issuer *auth.Issuer
}

func New(d Deps) *gin.Engine {
	if d.Cfg.Env != "dev" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(RequestID())
	r.Use(ReqLogger())
	r.Use(cors(d.Cfg.CORSOrigins))
	r.Use(auth.AuthMiddleware(d.Issuer))

	// loginDeps := auth.LoginDeps{
	// 	PG:       d.PG,
	// 	Issuer:   d.Issuer,
	// 	Refresh:  auth.NewRefreshStore(d.Redis),
	// 	Resolver: &auth.PgTenantResolver{Pool: d.PG},
	// }
	// r.POST("/auth/register", auth.RegisterHandler(loginDeps))
	// r.POST("/auth/login", auth.LoginHandler(loginDeps))
	// r.POST("/auth/refresh", auth.RefreshHandler(loginDeps))

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

	res := &resolver.Resolver{DepartmentService: department.New(department.NewRepository(d.PG)), GeographyService: geography.New(geography.NewRepository(d.PG))}
	gqlHandler := InitGraphHandler(res, d.PG)
	r.Any("/graphql", auth.TenantGuard(d.PG), gin.WrapH(gqlHandler))
	if d.Cfg.PlaygroundOn {
		r.GET("/playground", gin.WrapH(Playground("/graphql")))
	}
	return r
}

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if id == "" {
			id = uuid.NewString()
		}
		c.Set("request_id", id)
		c.Header("X-Request-ID", id)
		c.Next()
	}
}

func ReqLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Info().
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Int("status", c.Writer.Status()).
			Dur("dur", time.Since(start)).
			Str("rid", c.GetString("request_id")).
			Msg("http")
	}
}

func cors(origins []string) gin.HandlerFunc {
	allow := "*"
	if len(origins) == 1 {
		allow = origins[0]
	}
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", allow)
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Tenant-Code, X-Request-ID")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
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
