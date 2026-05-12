package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/pawan_13g/hrms/internal/modules/auth/util/jwt"
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	Login(
		ctx *jwt.Issuer,
		input LoginInput,
	) (*LoginResponse, error)

	RefreshToken(
		ctx context.Context,
		refreshToken string,
	) (*LoginResponse, error)
}

type service struct {
	repo Repository
}

func New(
	repo Repository,
) Service {

	return &service{
		repo: repo,
	}
}

func (s *service) Login(
	issuer *jwt.Issuer,
	input LoginInput,
) (*LoginResponse, error) {

	user, err := s.repo.GetUserByEmail(
		ctx,
		input.Email,
	)

	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(input.Password),
	)

	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	jti := uuid.NewString()

	pair, err := issuer.Issue(
		user.ID,
		jti,
	)

	if err != nil {
		return nil, err
	}

	err = s.refresh.Save(
		ctx,
		user.ID,
		jti,
		time.Until(pair.RefreshExp),
	)

	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  pair.Access,
		RefreshToken: pair.Refresh,
		AccessExp:    pair.AccessExp,
		RefreshExp:   pair.RefreshExp,
	}, nil
}

func (s *service) RefreshToken(
	ctx context.Context,
	refreshToken string,
) (*LoginResponse, error) {

	return &LoginResponse{
		AccessToken:  "",
		RefreshToken: "",
		AccessExp:    time.Now().Add(7 * 24 * time.Hour),
		RefreshExp:   time.Now().Add(7 * 24 * time.Hour),
	}, nil

}
