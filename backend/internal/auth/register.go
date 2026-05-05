package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// slugRunReplace collapses any run of non-alnum characters into a single hyphen.
var slugRunReplace = regexp.MustCompile(`[^a-z0-9]+`)

// maxSlugBase leaves room for a "-NN" collision suffix without exceeding the
// 64-char tenant_code limit enforced server-side.
const maxSlugBase = 60

// maxSlugAttempts caps collision retries so we never spin forever on a
// pathological hot tenant name. 99 is plenty in practice.
const maxSlugAttempts = 99

type registerRequest struct {
	TenantName string `json:"tenantName" binding:"required,min=2,max=255"`
	Email      string `json:"email"      binding:"required,email"`
	Password   string `json:"password"   binding:"required,min=8"`
}

type registerResponse struct {
	UserID     int64  `json:"userId"`
	TenantID   int64  `json:"tenantId"`
	TenantCode string `json:"tenantCode"`
	Email      string `json:"email"`
}

// RegisterHandler returns a Gin handler for POST /auth/register.
//
// Flow: validate → derive tenant code from name → bcrypt-hash → BEGIN →
// INSERT tenants (retrying on slug collision with -2, -3, …) → INSERT users
// → COMMIT. The whole pair runs in one transaction so a duplicate email
// cannot leave a half-built tenant behind.
//
// Tokens are NOT issued here; the client follows up with /auth/login.
func RegisterHandler(d LoginDeps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req registerRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		base := slugify(req.TenantName)
		if base == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "organization name must include letters or digits"})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "hash failed"})
			return
		}
		ctx := c.Request.Context()
		tenantID, userID, code, err := createTenantAndUser(ctx, d.PG, req.TenantName, base, req.Email, string(hash))
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
				switch pgErr.ConstraintName {
				case "users_email_global", "users_tenant_email":
					c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
				default:
					c.JSON(http.StatusConflict, gin.H{"error": "duplicate value"})
				}
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "create failed"})
			return
		}
		c.JSON(http.StatusCreated, registerResponse{
			UserID:     userID,
			TenantID:   tenantID,
			TenantCode: code,
			Email:      req.Email,
		})
	}
}

// slugify lowercases the input, replaces any run of non-alphanumerics with a
// hyphen, trims hyphens off the ends, and truncates to maxSlugBase chars.
func slugify(in string) string {
	s := slugRunReplace.ReplaceAllString(strings.ToLower(in), "-")
	s = strings.Trim(s, "-")
	if len(s) > maxSlugBase {
		s = strings.TrimRight(s[:maxSlugBase], "-")
	}
	return s
}

// createTenantAndUser opens a tx, inserts the tenant (retrying suffix on slug
// collision), then inserts the user. Returns the chosen tenant code so the
// caller can echo it back in the response.
func createTenantAndUser(ctx context.Context, pool *pgxpool.Pool, tenantName, baseCode, email, passwordHash string) (int64, int64, string, error) {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, 0, "", err
	}
	defer tx.Rollback(ctx)

	tenantID, code, err := insertTenantWithUniqueCode(ctx, tx, tenantName, baseCode)
	if err != nil {
		return 0, 0, "", err
	}

	var userID int64
	if err := tx.QueryRow(ctx, `
        INSERT INTO users (tenant_id, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
    `, tenantID, email, passwordHash).Scan(&userID); err != nil {
		return 0, 0, "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, "", err
	}
	return tenantID, userID, code, nil
}

// insertTenantWithUniqueCode tries `baseCode`, then `baseCode-2`, `-3`, … up
// to maxSlugAttempts. Each attempt runs inside a pgx pseudo-nested tx
// (savepoint under the hood) so a unique-violation rolls back only that
// attempt and the outer transaction stays alive.
//
// Why a loop instead of a sequence: tenant codes are user-visible URL slugs,
// so we want the prettiest free name, not a guaranteed-unique random string.
func insertTenantWithUniqueCode(ctx context.Context, tx pgx.Tx, name, base string) (int64, string, error) {
	for i := 1; i <= maxSlugAttempts; i++ {
		code := base
		if i > 1 {
			code = fmt.Sprintf("%s-%d", base, i)
		}
		sp, err := tx.Begin(ctx)
		if err != nil {
			return 0, "", err
		}
		var id int64
		insertErr := sp.QueryRow(ctx, `
            INSERT INTO tenants (name, code)
            VALUES ($1, $2)
            RETURNING id
        `, name, code).Scan(&id)
		if insertErr == nil {
			if err := sp.Commit(ctx); err != nil {
				return 0, "", err
			}
			return id, code, nil
		}
		_ = sp.Rollback(ctx)
		var pgErr *pgconn.PgError
		if errors.As(insertErr, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation && pgErr.ConstraintName == "tenants_code_key" {
			continue
		}
		return 0, "", insertErr
	}
	return 0, "", fmt.Errorf("could not allocate a free tenant code after %d attempts", maxSlugAttempts)
}
