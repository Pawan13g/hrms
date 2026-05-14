package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pawan13g/hrms/internal/core/util/context"
	"github.com/pawan13g/hrms/internal/modules/auth"
)

const (
	HeaderTenantCode = "X-Tenant-Code"
	bearerPrefix     = "Bearer "
)

type AuthMiddleWare struct {
	UserService auth.Service
}

func New(UserService auth.Service) *AuthMiddleWare {
	return &AuthMiddleWare{
		UserService: UserService,
	}
}

// AuthMiddleware parses an optional Bearer token, attaches a *Principal to both
// gin.Context and context.Context. Missing/invalid tokens are NOT rejected here
// — the request flows to handlers; per-route directives or TenantGuard enforce.
func (s *AuthMiddleWare) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := c.GetHeader("Authorization")
		if !strings.HasPrefix(raw, bearerPrefix) {
			c.Next()
			return
		}

		user, err := s.UserService.GetSession(raw[len(bearerPrefix):])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		c.Set("principal", user)
		ctx := context.WithPrincipal(c.Request.Context(), user)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}
