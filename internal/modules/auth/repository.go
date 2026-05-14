package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/pawan13g/hrms/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Repository interface {
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(userID uint64) (*models.User, error)
	SaveUserSession(userID uint64, jti string, ttl time.Duration) error
	RevokeUserSession(userID uint64, jti string) error
	IsUserSessionActive(userID uint64, jti string) (bool, error)
}

type repository struct {
	rds *redis.Client
	db  *gorm.DB
}

func NewRepository(db *gorm.DB, rds *redis.Client) Repository {
	return &repository{
		db:  db,
		rds: rds,
	}
}

func (r *repository) GetUserByEmail(
	email string,
) (*models.User, error) {

	var user models.User

	err := r.db.
		Where("email = ?", email).
		Where("status = ?", "active").
		First(&user).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, pgx.ErrNoRows
	}

	return &user, err
}

func (r *repository) GetUserByID(
	userID uint64,
) (*models.User, error) {

	var user models.User

	err := r.db.
		Where("id = ?", userID).
		Where("status = ?", "active").
		First(&user).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, pgx.ErrNoRows
	}

	return &user, err
}

func (r *repository) GetUserRoles(
	ctx context.Context,
	userID uint64,
) ([]uint64, error) {

	var roleIDs []uint64

	err := r.db.WithContext(ctx).
		Table("user_roles").
		Where("user_id = ?", userID).
		Pluck("role_id", &roleIDs).Error

	return roleIDs, err
}

func (r *repository) GetPermissionsByRoles(
	ctx context.Context,
	tenantID uint64,
	roleIDs []uint64,
) ([]string, error) {

	var permissions []string

	err := r.db.WithContext(ctx).
		Table("permissions p").
		Select("DISTINCT p.key").
		Joins("JOIN role_permissions rp ON rp.permission_id = p.id").
		Joins("JOIN roles r ON r.id = rp.role_id").
		Where("r.tenant_id = ?", tenantID).
		Where("r.id IN ?", roleIDs).
		Pluck("p.key", &permissions).Error

	return permissions, err
}

func (r *repository) SaveUserSession(userID uint64, jti string, ttl time.Duration) error {
	if jti == "" {
		return errors.New("refresh: empty jti")
	}
	return r.rds.Set(context.Background(), _getUserKey(userID, jti), "1", ttl).Err()
}

func (r *repository) IsUserSessionActive(userID uint64, jti string) (bool, error) {
	v, err := r.rds.Get(context.Background(), _getUserKey(userID, jti)).Result()
	if errors.Is(err, redis.Nil) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return v == "1", nil
}

func (r *repository) RevokeUserSession(userID uint64, jti string) error {
	return r.rds.Del(context.Background(), _getUserKey(userID, jti)).Err()
}

func _getUserKey(userID uint64, jti string) string {
	return fmt.Sprintf("user:%d:refresh:%s", userID, jti)
}
