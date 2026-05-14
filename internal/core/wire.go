package core

import (
	"github.com/google/wire"
	"github.com/redis/go-redis/v9"

	"github.com/pawan13g/hrms/internal/core/middleware"
	"github.com/pawan13g/hrms/internal/modules/auth"
	"github.com/pawan13g/hrms/internal/modules/auth/util/jwt"

	"gorm.io/gorm"
)

type Application struct {
	AuthMiddleware *middleware.AuthMiddleWare
	AuthService    auth.Service
}

var ProviderSet = wire.NewSet(

	// modules
	auth.ProviderSet,

	// middleware
	middleware.New,
)

func InitContainer(
	db *gorm.DB,
	rdb *redis.Client,
	issuer *jwt.Issuer,
) *Application {

	wire.Build(
		ProviderSet,

		wire.Struct(
			new(Application),
			"*",
		),
	)

	return &Application{}
}
