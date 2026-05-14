package tenent

import (
	"github.com/pawan13g/hrms/models"
	"gorm.io/gorm"
)

type Repository interface {
	Create(tenent *models.Tenant) error
	GetById(tenantID uint64) (*models.Tenant, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(
	tenent *models.Tenant,
) error {
	return r.db.Create(tenent).Error
}

func (r *repository) GetById(
	tenantID uint64,
) (*models.Tenant, error)
