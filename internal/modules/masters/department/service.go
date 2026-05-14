package department

import (
	"github.com/pawan13g/hrms/graph/model"
	"github.com/pawan13g/hrms/models"
)

type Service interface {
	Create(auth model.AuthUser, department *models.Department) error
	GetAll(auth model.AuthUser) ([]*models.Department, error)
	GetByID(auth model.AuthUser, id uint64) (*models.Department, error)
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
	auth model.AuthUser,
	department *models.Department,
) error {
	return s.repo.Create(department)
}

func (s *service) GetAll(
	auth model.AuthUser,
) ([]*models.Department, error) {
	return s.repo.GetAll(auth.TenantID)
}

func (s *service) GetByID(
	auth model.AuthUser, id uint64,
) (*models.Department, error) {
	return s.repo.GetByID(auth.TenantID, id)
}
