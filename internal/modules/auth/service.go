package auth

import (
	"errors"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/pawan13g/hrms/graph/model"
	"github.com/pawan13g/hrms/internal/modules/auth/util/jwt"
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	Login(input model.LoginInput) (*model.Login, error)
	RefreshSession(refreshToken string) (*model.Login, error)
	RevokeSession(refreshToken string) error
	GetSession(token string) (*model.AuthUser, error)
}

type service struct {
	repo   Repository
	issuer *jwt.Issuer
}

func New(repo Repository, issuer *jwt.Issuer) Service {
	return &service{
		repo:   repo,
		issuer: issuer,
	}
}

func (s *service) Login(input model.LoginInput) (*model.Login, error) {

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

	pair, err := s.issuer.Issue(
		user.ID,
		jti,
	)

	if err != nil {
		return nil, err
	}

	if s.repo.SaveUserSession(user.ID, jti, time.Until(pair.RefreshExp)) != nil {
		return nil, err
	}

	return &model.Login{
		AccessToken:  pair.Access,
		RefreshToken: pair.Refresh,
		AccessExp:    strconv.FormatInt(pair.AccessExp.Unix(), 10),
		RefreshExp:   strconv.FormatInt(pair.RefreshExp.Unix(), 10),
	}, nil
}

func (s *service) RevokeSession(refreshToken string) error {

	claims, err := s.issuer.Parse(refreshToken)
	if err != nil {
		return errors.New("invalid refresh")
	}

	userID, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil {
		return errors.New("invalid refresh")
	}

	return s.repo.RevokeUserSession(userID, claims.JTI)
}

func (s *service) RefreshSession(refreshToken string) (*model.Login, error) {

	claims, err := s.issuer.Parse(refreshToken)
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
	pair, err := s.issuer.Issue(userID, jti)
	if err != nil {
		return nil, errors.New("token issue failed")
	}
	if err := s.repo.SaveUserSession(userID, jti, time.Until(pair.RefreshExp)); err != nil {
		return nil, errors.New("refresh save failed")
	}

	return &model.Login{
		AccessToken:  pair.Access,
		RefreshToken: pair.Refresh,
		AccessExp:    strconv.FormatInt(pair.AccessExp.Unix(), 10),
		RefreshExp:   strconv.FormatInt(pair.RefreshExp.Unix(), 10),
	}, nil
}

func (s *service) GetSession(token string) (*model.AuthUser, error) {
	claims, err := s.issuer.Parse(token)
	if err != nil {
		return nil, errors.New("invalid token")
	}

	userID, err := strconv.ParseUint(claims.Subject, 10, 64)

	user, err := s.repo.GetUserByID(userID)

	if err != nil {
		return nil, errors.New("invalid token")
	}
	return &model.AuthUser{
		UserID:    user.ID,
		TenantID:  user.TenantID,
		Email:     user.Email,
		Name:      user.FirstName + " " + user.LastName,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Phone:     &user.Phone,
	}, nil
}
