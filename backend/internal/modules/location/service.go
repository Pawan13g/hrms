package location

import (
	"context"
	"errors"
	"time"
)

type Service struct{ Repo *Repo }

func NewService(r *Repo) *Service { return &Service{Repo: r} }

func (s *Service) Get(ctx context.Context, tenantID, id int64) (*Location, error) {
	return s.Repo.Get(ctx, tenantID, id)
}

func (s *Service) List(ctx context.Context, tenantID int64) ([]Location, error) {
	return s.Repo.List(ctx, tenantID)
}

func (s *Service) Create(ctx context.Context, tenantID int64, in CreateInput) (*Location, error) {
	if err := validateTimezone(in.Timezone); err != nil {
		return nil, err
	}
	return s.Repo.Create(ctx, tenantID, in)
}

func (s *Service) Update(ctx context.Context, tenantID, id int64, in UpdateInput) (*Location, error) {
	if err := validateTimezone(in.Timezone); err != nil {
		return nil, err
	}
	return s.Repo.Update(ctx, tenantID, id, in)
}

func (s *Service) Delete(ctx context.Context, tenantID, id int64) error {
	return s.Repo.SoftDelete(ctx, tenantID, id)
}

// validateTimezone enforces that the supplied tz parses against the host's
// IANA tz database. We reject early so frontend rendering with
// time.LoadLocation never has to deal with garbage.
func validateTimezone(tz *string) error {
	if tz == nil || *tz == "" {
		return nil
	}
	if _, err := time.LoadLocation(*tz); err != nil {
		return errors.New("unknown timezone: " + *tz)
	}
	return nil
}
