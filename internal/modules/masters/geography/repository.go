package geography

import (
	"github.com/pawan13g/hrms/models"
	"gorm.io/gorm"
)

type Repository interface {
	// Country
	GetCountries() ([]models.Country, error)
	CreateCountry(country *models.Country) error
	GetCountryById(id uint64) (*models.Country, error)

	// State
	CreateState(state *models.State) error
	GetStateById(id uint64) (*models.State, error)
	GetStatesByCountryId(countryID uint64) ([]models.State, error)
	GetStateByCityId(cityID uint64) (*models.State, error)
	// City
	CreateCity(city *models.City) error
	GetCityById(id uint64) (*models.City, error)
	GetCitiesByStateId(stateID uint64) ([]models.City, error)
	GetCitiesByCountryId(countryID uint64) ([]models.City, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// Country Implementations
func (r *repository) CreateCountry(c *models.Country) error {
	return r.db.Create(c).Error
}

func (r *repository) GetCountryById(id uint64) (*models.Country, error) {
	var c models.Country
	err := r.db.Preload("States").First(&c, id).Error
	return &c, err
}

func (r *repository) GetCountries() ([]models.Country, error) {
	var countries []models.Country
	err := r.db.Find(&countries).Where("status = ?", "active").Error
	return countries, err
}

// State Implementations
func (r *repository) CreateState(s *models.State) error {
	return r.db.Create(s).Error
}

func (r *repository) GetStateById(id uint64) (*models.State, error) {
	var s models.State
	err := r.db.Preload("Cities").First(&s, id).Error
	return &s, err
}

// City Implementations
func (r *repository) CreateCity(city *models.City) error {
	return r.db.Create(city).Error
}

func (r *repository) GetCityById(id uint64) (*models.City, error) {
	var city models.City
	err := r.db.First(&city, id).Error
	return &city, err
}

func (r *repository) GetStatesByCountryId(countryID uint64) ([]models.State, error) {
	var states []models.State
	err := r.db.Where("country_id = ?", countryID).Find(&states).Error
	return states, err
}

// GetStateByCityId finds the state associated with a specific city
func (r *repository) GetStateByCityId(cityID uint64) (*models.State, error) {
	var state models.State
	// We join with cities to find the state record associated with the City ID
	err := r.db.Joins("JOIN cities ON cities.state_id = states.id").
		Where("cities.id = ?", cityID).
		First(&state).Error
	return &state, err
}

// GetCitiesByStateId returns all cities linked to a specific state
func (r *repository) GetCitiesByStateId(stateID uint64) ([]models.City, error) {
	var cities []models.City
	err := r.db.Where("state_id = ?", stateID).Find(&cities).Error
	return cities, err
}

// GetCitiesByCountryId returns all cities in a country by joining states
func (r *repository) GetCitiesByCountryId(countryID uint64) ([]models.City, error) {
	var cities []models.City
	// We join cities to states to filter by the CountryID located in the states table
	err := r.db.Table("cities").
		Joins("JOIN states ON states.id = cities.state_id").
		Where("states.country_id = ?", countryID).
		Find(&cities).Error
	return cities, err
}
