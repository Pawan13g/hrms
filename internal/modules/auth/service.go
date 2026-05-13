package auth

import (
	"errors"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/pawan_13g/hrms/internal/modules/auth/util/jwt"
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	Login(
		issuer *jwt.Issuer,
		input LoginInput,
	) (*LoginResponse, error)

	RefreshToken(
		issuer *jwt.Issuer,
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

	if s.repo.SaveUserSession(user.ID, jti, time.Until(pair.RefreshExp)) != nil {
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
	issuer *jwt.Issuer,
	refreshToken string,
) (*LoginResponse, error) {

	claims, err := issuer.Parse(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh")
	}

	userID, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil {
		return nil, errors.New("invalid refresh")
	}

	active, err := s.repo.IsUserSessionActive(userID, claims.JTI)
	if err != nil || !active {
		return nil, errors.New("refresh revoked")
	}

	s.repo.RevokeUserSession(userID, claims.JTI)

	jti := uuid.NewString()
	pair, err := issuer.Issue(userID, jti)
	if err != nil {
		return nil, errors.New("token issue failed")
	}
	if err := s.repo.SaveUserSession(userID, jti, time.Until(pair.RefreshExp)); err != nil {
		return nil, errors.New("refresh save failed")
	}

	return &LoginResponse{
		AccessToken:  pair.Access,
		RefreshToken: pair.Refresh,
		AccessExp:    pair.AccessExp,
		RefreshExp:   pair.RefreshExp,
	}, nil
}
