package server

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/sodium-labs/hrms/backend/internal/audit"
	"github.com/sodium-labs/hrms/backend/internal/auth"
	"github.com/sodium-labs/hrms/backend/internal/config"
	"github.com/sodium-labs/hrms/backend/internal/graph"
	"github.com/sodium-labs/hrms/backend/internal/graph/resolver"
	"github.com/sodium-labs/hrms/backend/internal/modules/department"
	"github.com/sodium-labs/hrms/backend/internal/modules/designation"
	"github.com/sodium-labs/hrms/backend/internal/modules/employee"
	"github.com/sodium-labs/hrms/backend/internal/modules/geography"
	"github.com/sodium-labs/hrms/backend/internal/modules/location"
	"github.com/sodium-labs/hrms/backend/internal/modules/role"
)

type Deps struct {
	Cfg    *config.Config
	PG     *pgxpool.Pool
	Redis  *redis.Client
	Issuer *auth.Issuer
	Audit  *audit.Recorder
}

func New(d Deps) *gin.Engine {
	if d.Cfg.Env != "dev" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(requestID())
	r.Use(reqLogger())
	r.Use(cors(d.Cfg.CORSOrigins))
	r.Use(auth.AuthMiddleware(d.Issuer))
	r.Use(auth.TenantGuard(d.PG))

	loginDeps := auth.LoginDeps{
		PG:       d.PG,
		Issuer:   d.Issuer,
		Refresh:  auth.NewRefreshStore(d.Redis),
		Resolver: &auth.PgTenantResolver{Pool: d.PG},
	}
	r.POST("/auth/register", auth.RegisterHandler(loginDeps))
	r.POST("/auth/login", auth.LoginHandler(loginDeps))
	r.POST("/auth/refresh", auth.RefreshHandler(loginDeps))

	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/readyz", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := d.PG.Ping(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"pg": err.Error()})
			return
		}
		if err := d.Redis.Ping(ctx).Err(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"redis": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	deptSvc := department.NewService(department.NewRepo(d.PG))
	desigSvc := designation.NewService(designation.NewRepo(d.PG), deptSvc)
	locSvc := location.NewService(location.NewRepo(d.PG))
	empSvc := employee.NewService(employee.NewRepo(d.PG), d.Audit, deptSvc, desigSvc, locSvc)
	roleSvc := role.NewService(role.NewRepo(d.PG))
	res := &resolver.Resolver{
		DeptSvc:  deptSvc,
		DesigSvc: desigSvc,
		LocSvc:   locSvc,
		EmpSvc:   empSvc,
		GeoRepo:  geography.NewRepo(d.PG),
		RoleSvc:  roleSvc,
	}
	gqlHandler := graph.NewHandler(res)
	r.Any("/graphql", gin.WrapH(gqlHandler))
	if d.Cfg.PlaygroundOn {
		r.GET("/playground", gin.WrapH(graph.Playground("/graphql")))
	}
	return r
}

func requestID() gin.HandlerFunc {
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

func reqLogger() gin.HandlerFunc {
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
