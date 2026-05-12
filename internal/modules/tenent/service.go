package tenent

import "github.com/pawan_13g/hrms/models"

type Service interface {
	Create(tenent *models.Tenant) error
	GetById(tenantID uint64) (*models.Tenant, error)
}

type service struct {
	repo Repository
}

func New(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Create(
	tenent *models.Tenant,
) error {
	return s.repo.Create(tenent)
}

func (s *service) GetById(
	tenantID uint64,
) (*models.Tenant, error) {
	return s.repo.GetById(tenantID)
}
