package container

import (
	"github.com/google/wire"
	"github.com/redis/go-redis/v9"

	"github.com/pawan13g/hrms/internal/core/middleware"
	"github.com/pawan13g/hrms/internal/modules/auth"
	"github.com/pawan13g/hrms/internal/modules/auth/util/jwt"

	"gorm.io/gorm"
)

type Container struct {
	AuthMiddleware *middleware.AuthMiddleWare

	AuthService auth.Service
	// DepartmentService department.Service
	// GeographyService geography.Service
}

var ProviderSet = wire.NewSet(

	// auth
	auth.ProviderSet,

	// geography
	// geography.ProviderSet,

	// department
	// department.ProviderSet,

	// middleware
	middleware.New,
)

func InitContainer(
	db *gorm.DB,
	rdb *redis.Client,
	issuer *jwt.Issuer,
) *Container {

	wire.Build(
		ProviderSet,

		wire.Struct(
			new(Container),
			"*",
		),
	)

	return &Container{}
}
