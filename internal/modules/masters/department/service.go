package department

import (
	"github.com/pawan_13g/hrms/internal/core/auth"
	"github.com/pawan_13g/hrms/models"
)

type Service interface {
	Create(auth auth.Principal, department *models.Department) error
	GetAll(auth auth.Principal) ([]*models.Department, error)
	GetByID(auth auth.Principal, id uint64) (*models.Department, error)
}

type service struct {
	repo Repository
}

func New(
	repo Repository,
) Service {
	return &service{repo: repo}
}

func (s *service) Create(
	auth auth.Principal,
	department *models.Department,
) error {
	return s.repo.Create(department)
}

func (s *service) GetAll(
	auth auth.Principal,
) ([]*models.Department, error) {
	return s.repo.GetAll(uint64(auth.TenantID))
}

func (s *service) GetByID(
	auth auth.Principal, id uint64,
) (*models.Department, error) {
	return s.repo.GetByID(uint64(auth.TenantID), id)
}
