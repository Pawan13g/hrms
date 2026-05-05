package auth

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// LoginDeps wires everything the auth REST endpoints need: DB for user lookup,
// the JWT issuer, and the Redis-backed refresh store.
type LoginDeps struct {
	PG       *pgxpool.Pool
	Issuer   *Issuer
	Refresh  *RefreshStore
	Resolver TenantResolver
}

// TenantResolver maps a tenant code (from header or body) to a tenant id.
// Pulling this through an interface keeps tests independent of the DB.
type TenantResolver interface {
	ResolveTenant(ctx context.Context, code string) (int64, error)
}

// PgTenantResolver looks the tenant up in Postgres by `code`.
type PgTenantResolver struct{ Pool *pgxpool.Pool }

func (r *PgTenantResolver) ResolveTenant(ctx context.Context, code string) (int64, error) {
	var id int64
	err := r.Pool.QueryRow(ctx,
		`SELECT id FROM tenants WHERE code = $1 AND status = 'active'`, code,
	).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, errors.New("unknown tenant")
	}
	return id, err
}

type loginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=1"`
}

type loginResponse struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	AccessExp    time.Time `json:"accessExp"`
	RefreshExp   time.Time `json:"refreshExp"`
}

// LoginHandler returns a Gin handler for POST /auth/login.
//
// Flow: SELECT user by email (the global unique index makes this unambiguous,
// see migration 0020) → bcrypt.CompareHashAndPassword → load roles + perm
// keys for that user's tenant → issue JWT pair with a fresh JTI → persist
// JTI in Redis with refresh TTL.
func LoginHandler(d LoginDeps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req loginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		ctx := c.Request.Context()
		userID, tenantID, hash, ok, err := lookupUserByEmail(ctx, d.PG, req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "lookup failed"})
			return
		}
		if !ok || bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		roles, perms, err := loadRolesAndPerms(ctx, d.PG, tenantID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "perm load failed"})
			return
		}
		jti := uuid.NewString()
		pair, err := d.Issuer.Issue(userID, tenantID, roles, perms, jti)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "token issue failed"})
			return
		}
		if err := d.Refresh.Save(ctx, userID, jti, time.Until(pair.RefreshExp)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "refresh save failed"})
			return
		}
		c.JSON(http.StatusOK, loginResponse{
			AccessToken:  pair.Access,
			RefreshToken: pair.Refresh,
			AccessExp:    pair.AccessExp,
			RefreshExp:   pair.RefreshExp,
		})
	}
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

// RefreshHandler validates a refresh token, checks Redis for JTI presence,
// rotates the JTI, and issues a new pair. Old JTI is revoked.
func RefreshHandler(d LoginDeps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req refreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		claims, err := d.Issuer.Parse(req.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh"})
			return
		}
		userID, err := atoi(claims.Subject)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh"})
			return
		}
		ctx := c.Request.Context()
		active, err := d.Refresh.IsActive(ctx, userID, claims.JTI)
		if err != nil || !active {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "refresh revoked"})
			return
		}
		_ = d.Refresh.Revoke(ctx, userID, claims.JTI)

		roles, perms, err := loadRolesAndPerms(ctx, d.PG, claims.TenantID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "perm load failed"})
			return
		}
		newJTI := uuid.NewString()
		pair, err := d.Issuer.Issue(userID, claims.TenantID, roles, perms, newJTI)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "token issue failed"})
			return
		}
		if err := d.Refresh.Save(ctx, userID, newJTI, time.Until(pair.RefreshExp)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "refresh save failed"})
			return
		}
		c.JSON(http.StatusOK, loginResponse{
			AccessToken:  pair.Access,
			RefreshToken: pair.Refresh,
			AccessExp:    pair.AccessExp,
			RefreshExp:   pair.RefreshExp,
		})
	}
}

func lookupUserByEmail(ctx context.Context, pool *pgxpool.Pool, email string) (int64, int64, string, bool, error) {
	var (
		id       int64
		tenantID int64
		hash     string
	)
	err := pool.QueryRow(ctx, `
        SELECT id, tenant_id, password_hash
        FROM users
        WHERE email = $1 AND status = 'active' AND is_active = TRUE
    `, email).Scan(&id, &tenantID, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, 0, "", false, nil
	}
	if err != nil {
		return 0, 0, "", false, err
	}
	return id, tenantID, hash, true, nil
}

func loadRolesAndPerms(ctx context.Context, pool *pgxpool.Pool, tenantID, userID int64) ([]int64, []string, error) {
	rows, err := pool.Query(ctx, `
        SELECT role_id FROM user_roles WHERE user_id = $1
    `, userID)
	if err != nil {
		return nil, nil, err
	}
	var roles []int64
	for rows.Next() {
		var rid int64
		if err := rows.Scan(&rid); err != nil {
			rows.Close()
			return nil, nil, err
		}
		roles = append(roles, rid)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	if len(roles) == 0 {
		return roles, nil, nil
	}
	prows, err := pool.Query(ctx, `
        SELECT DISTINCT p.key
        FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        JOIN roles r            ON r.id = rp.role_id
        WHERE r.tenant_id = $1 AND r.id = ANY($2)
    `, tenantID, roles)
	if err != nil {
		return nil, nil, err
	}
	defer prows.Close()
	var perms []string
	for prows.Next() {
		var k string
		if err := prows.Scan(&k); err != nil {
			return nil, nil, err
		}
		perms = append(perms, k)
	}
	return roles, perms, prows.Err()
}
