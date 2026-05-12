package auth

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"gorm.io/gorm"

	"github.com/pawan_13g/hrms/models"
)

type Repository interface {
	GetUserByEmail(email string) (*models.User, error)
	GetUserRoles(ctx context.Context, userID uint64) ([]uint64, error)
	GetPermissionsByRoles(ctx context.Context, tenantID uint64, roleIDs []uint64) ([]string, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{
		db: db,
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
