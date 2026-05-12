package geography

import "github.com/pawan_13g/hrms/models"

type Service interface {
	GetCountries() ([]models.Country, error)

	CreateCountry(country *models.Country) error
	GetCountry(id uint64) (*models.Country, error)

	CreateState(state *models.State) error
	GetState(id uint64) (*models.State, error)

	CreateCity(city *models.City) error
	GetCity(id uint64) (*models.City, error)

	GetStatesByCountryById(countryID uint64) ([]models.State, error)
	GetStateByCityById(cityID uint64) (*models.State, error)

	GetCitiesByStateId(stateID uint64) ([]models.City, error)
	GetCitiesByCountryId(countryID uint64) ([]models.City, error)
}

type service struct {
	repo Repository
}

func New(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateCountry(c *models.Country) error         { return s.repo.CreateCountry(c) }
func (s *service) GetCountry(id uint64) (*models.Country, error) { return s.repo.GetCountryById(id) }
func (s *service) GetCountries() ([]models.Country, error)       { return s.repo.GetCountries() }

func (s *service) CreateState(st *models.State) error        { return s.repo.CreateState(st) }
func (s *service) GetState(id uint64) (*models.State, error) { return s.repo.GetStateById(id) }

func (s *service) CreateCity(c *models.City) error         { return s.repo.CreateCity(c) }
func (s *service) GetCity(id uint64) (*models.City, error) { return s.repo.GetCityById(id) }

func (s *service) GetStatesByCountryById(countryID uint64) ([]models.State, error) {
	return s.repo.GetStatesByCountryId(countryID)
}

func (s *service) GetStateByCityById(cityID uint64) (*models.State, error) {
	return s.repo.GetStateByCityId(cityID)
}

func (s *service) GetCitiesByStateId(stateID uint64) ([]models.City, error) {
	return s.repo.GetCitiesByStateId(stateID)
}

func (s *service) GetCitiesByCountryId(countryID uint64) ([]models.City, error) {
	return s.repo.GetCitiesByCountryId(countryID)
}
