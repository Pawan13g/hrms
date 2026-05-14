package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pawan13g/hrms/configs"
	"github.com/rs/zerolog/log"
)

func RegisterRequestMiddleware(
	r *gin.Engine,
	cfg *configs.Config,
) {

	r.Use(RequestID())
	r.Use(ReqLogger())
	r.Use(cors(cfg.CORSOrigins))
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
