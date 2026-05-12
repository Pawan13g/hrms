package resolver

import (
	"context"

	"github.com/pawan_13g/hrms/graph/generated"
	"github.com/pawan_13g/hrms/graph/model"
	"github.com/pawan_13g/hrms/models"
)

// =====================================
// MAPPERS
// =====================================

func mapCountryToGraphql(
	country *models.Country,
) *model.Country {

	if country == nil {
		return nil
	}

	return &model.Country{
		ID:                  country.ID,
		Code:                country.Code,
		Name:                country.Name,
		IsoCode:             country.ISOCode,
		CurrencyCode:        country.CurrencyCode,
		CurrencySymbol:      country.CurrencySymbol,
		PhoneCode:           country.PhoneCode,
		Timezone:            country.Timezone,
		DateFormat:          country.DateFormat,
		FiscalYearStart:     country.FiscalYearStart,
		WorkingHoursPerWeek: float64(country.WorkingHoursPerWeek),
		Status:              country.Status,
	}
}

func mapStateToGraphql(
	state *models.State,
) *model.State {

	if state == nil {
		return nil
	}

	return &model.State{
		ID:        state.ID,
		CountryID: state.CountryID,
		Name:      state.Name,
		Code:      &state.Code,
		Status:    state.Status,
	}
}

func mapCityToGraphql(
	city *models.City,
) *model.City {

	if city == nil {
		return nil
	}

	return &model.City{
		ID:      city.ID,
		StateID: city.StateID,
		Name:    city.Name,
		Code:    &city.Code,
		Status:  city.Status,
	}
}

// =====================================
// MUTATIONS
// =====================================

// CreateCountry is the resolver for the createCountry field.
func (r *mutationResolver) CreateCountry(
	ctx context.Context,
	input model.CreateCountryInput,
) (*model.Country, error) {

	country := &models.Country{
		Code:                input.Code,
		Name:                input.Name,
		ISOCode:             input.IsoCode,
		CurrencyCode:        input.CurrencyCode,
		CurrencySymbol:      input.CurrencySymbol,
		PhoneCode:           input.PhoneCode,
		Timezone:            input.Timezone,
		DateFormat:          *input.DateFormat,
		FiscalYearStart:     *input.FiscalYearStart,
		WorkingHoursPerWeek: *input.WorkingHoursPerWeek,
		StatusModel:         models.StatusModel{Status: "active"},
	}

	err := r.GeographyService.CreateCountry(country)

	if err != nil {
		return nil, err
	}

	return mapCountryToGraphql(country), nil
}

// CreateState is the resolver for the createState field.
func (r *mutationResolver) CreateState(
	ctx context.Context,
	input model.CreateStateInput,
) (*model.State, error) {

	state := &models.State{
		CountryID:   input.CountryID,
		Name:        input.Name,
		Code:        *input.Code,
		StatusModel: models.StatusModel{Status: "active"},
	}

	err := r.GeographyService.CreateState(state)

	if err != nil {
		return nil, err
	}

	return mapStateToGraphql(state), nil
}

// CreateCity is the resolver for the createCity field.
func (r *mutationResolver) CreateCity(
	ctx context.Context,
	input model.CreateCityInput,
) (*model.City, error) {

	city := &models.City{
		StateID:     input.StateID,
		Name:        input.Name,
		Code:        *input.Code,
		StatusModel: models.StatusModel{Status: "active"},
	}

	err := r.GeographyService.CreateCity(city)

	if err != nil {
		return nil, err
	}

	return mapCityToGraphql(city), nil
}

// =====================================
// QUERIES
// =====================================

// GetCountryByID is the resolver for the getCountryById field.
func (r *queryResolver) GetCountryByID(
	ctx context.Context,
	id uint64,
) (*model.Country, error) {

	country, err := r.GeographyService.GetCountry(id)

	if err != nil {
		return nil, err
	}

	return mapCountryToGraphql(country), nil
}

// GetCountries is the resolver for the getCountries field.
func (r *queryResolver) GetCountries(
	ctx context.Context,
) ([]*model.Country, error) {

	// Add this service method if needed
	countries, err := r.GeographyService.GetCountries()

	if err != nil {
		return nil, err
	}

	response := make([]*model.Country, 0)

	for _, country := range countries {
		c := country
		response = append(response, mapCountryToGraphql(&c))
	}

	return response, nil
}

// GetStateByID is the resolver for the getStateById field.
func (r *queryResolver) GetStateByID(
	ctx context.Context,
	id uint64,
) (*model.State, error) {

	state, err := r.GeographyService.GetState(id)

	if err != nil {
		return nil, err
	}

	return mapStateToGraphql(state), nil
}

// GetStatesByCountryID is the resolver for the getStatesByCountryId field.
func (r *queryResolver) GetStatesByCountryID(
	ctx context.Context,
	countryID uint64,
) ([]*model.State, error) {

	states, err := r.GeographyService.GetStatesByCountryById(countryID)

	if err != nil {
		return nil, err
	}

	response := make([]*model.State, 0)

	for _, state := range states {
		s := state
		response = append(response, mapStateToGraphql(&s))
	}

	return response, nil
}

// GetStateByCityID is the resolver for the getStateByCityId field.
func (r *queryResolver) GetStateByCityID(
	ctx context.Context,
	cityID uint64,
) (*model.State, error) {

	state, err := r.GeographyService.GetStateByCityById(cityID)

	if err != nil {
		return nil, err
	}

	return mapStateToGraphql(state), nil
}

// GetCityByID is the resolver for the getCityById field.
func (r *queryResolver) GetCityByID(
	ctx context.Context,
	id uint64,
) (*model.City, error) {

	city, err := r.GeographyService.GetCity(id)

	if err != nil {
		return nil, err
	}

	return mapCityToGraphql(city), nil
}

// GetCitiesByStateID is the resolver for the getCitiesByStateId field.
func (r *queryResolver) GetCitiesByStateID(
	ctx context.Context,
	stateID uint64,
) ([]*model.City, error) {

	cities, err := r.GeographyService.GetCitiesByStateId(stateID)

	if err != nil {
		return nil, err
	}

	response := make([]*model.City, 0)

	for _, city := range cities {
		c := city
		response = append(response, mapCityToGraphql(&c))
	}

	return response, nil
}

// GetCitiesByCountryID is the resolver for the getCitiesByCountryId field.
func (r *queryResolver) GetCitiesByCountryID(
	ctx context.Context,
	countryID uint64,
) ([]*model.City, error) {

	cities, err := r.GeographyService.GetCitiesByCountryId(countryID)

	if err != nil {
		return nil, err
	}

	response := make([]*model.City, 0)

	for _, city := range cities {
		c := city
		response = append(response, mapCityToGraphql(&c))
	}

	return response, nil
}

// Mutation returns generated.MutationResolver implementation.
func (r *Resolver) Mutation() generated.MutationResolver {
	return &mutationResolver{r}
}

// Query returns generated.QueryResolver implementation.
func (r *Resolver) Query() generated.QueryResolver {
	return &queryResolver{r}
}

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
