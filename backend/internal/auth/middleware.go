package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	HeaderTenantCode = "X-Tenant-Code"
	bearerPrefix     = "Bearer "
)

// AuthMiddleware parses an optional Bearer token, attaches a *Principal to both
// gin.Context and context.Context. Missing/invalid tokens are NOT rejected here
// — the request flows to handlers; per-route directives or TenantGuard enforce.
func AuthMiddleware(issuer *Issuer) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := c.GetHeader("Authorization")
		if !strings.HasPrefix(raw, bearerPrefix) {
			c.Next()
			return
		}
		claims, err := issuer.Parse(raw[len(bearerPrefix):])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		p, err := PrincipalFromClaims(claims)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
			return
		}
		c.Set("principal", p)
		ctx := WithPrincipal(c.Request.Context(), p)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// RequireAuth aborts when the request has no authenticated Principal.
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := FromContext(c.Request.Context()); !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}
}

// TenantGuard rejects when the JWT tenant id does not match the tenant
// resolved from the X-Tenant-Code header (defense-in-depth against stolen
// tokens being used against a different tenant).
func TenantGuard(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		p, ok := FromContext(c.Request.Context())
		if !ok {
			c.Next()
			return
		}
		code := c.GetHeader(HeaderTenantCode)
		if code == "" {
			c.Next()
			return
		}
		var tid int64
		err := pool.QueryRow(c.Request.Context(),
			`SELECT id FROM tenants WHERE code = $1 AND status = 'active'`, code,
		).Scan(&tid)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "unknown tenant"})
			return
		}
		if tid != p.TenantID {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "tenant mismatch"})
			return
		}
		c.Next()
	}
}

// EnsureCtx is a small helper for non-middleware paths that need to read the
// principal back out of a context.Context.
func EnsureCtx(ctx context.Context) (*Principal, bool) { return FromContext(ctx) }
