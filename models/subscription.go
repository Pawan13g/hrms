package models

import (
	"time"

	"gorm.io/datatypes"
)

type AppModule struct {
	BaseModel
	StatusModel

	Name         string `gorm:"size:255;unique;not null"`
	Code         string `gorm:"size:64;unique;not null"`
	Description  string `gorm:"type:text"`
	Icon         string `gorm:"size:128"`
	DisplayOrder int
}

type Package struct {
	BaseModel
	StatusModel

	Name         string `gorm:"size:255;not null"`
	Code         string `gorm:"size:64;unique;not null"`
	Description  string `gorm:"type:text"`
	MaxEmployees int
	PriceMonthly float64 `gorm:"type:numeric(12,2)"`
	PriceAnnual  float64 `gorm:"type:numeric(12,2)"`
	CurrencyCode string  `gorm:"size:3;not null"`

	Features datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
}

type PackageModule struct {
	ID uint64 `gorm:"primaryKey"`

	PackageID uint64
	Package   Package

	ModuleID uint64
	Module   AppModule
}

type TenantSubscription struct {
	BaseModel
	StatusModel

	TenantID uint64
	Tenant   Tenant

	PackageID uint64
	Package   Package

	StartDate time.Time
	EndDate   time.Time

	IsTrial bool
}
