package department

import (
	"github.com/pawan_13g/hrms/models"
	"gorm.io/gorm"
)

type Repository interface {
	Create(department *models.Department) error
	GetAll(tenantID uint64) ([]*models.Department, error)
	GetByID(tenantID uint64, id uint64) (*models.Department, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(
	department *models.Department,
) error {
	return r.db.Create(department).Error
}

func (r *repository) GetAll(
	tenantID uint64,
) ([]*models.Department, error) {

	var departments []*models.Department

	err := r.db.
		Where("tenant_id = ?", tenantID).
		Find(&departments).Error

	return departments, err
}

func (r *repository) GetByID(
	tenantID uint64, id uint64,
) (*models.Department, error) {
	var department models.Department
	err := r.db.
		Where("tenant_id = ? AND id = ?", tenantID, id).
		First(&department).Error

	return &department, err
}
