package models

import "gorm.io/datatypes"

type Tenant struct {
	BaseModel
	StatusModel

	Name               string  `gorm:"size:255;not null"`
	Code               string  `gorm:"size:255;unique;not null"`
	LegalName          *string `gorm:"size:255"`
	RegistrationNumber *string `gorm:"size:128"`
	TaxID              *string `gorm:"size:128"`

	CountryID *uint64
	Country   *Country

	CityID *uint64
	City   *City

	PrimaryCurrency string         `gorm:"size:3;not null"`
	Timezone        string         `gorm:"size:64;default:'UTC'"`
	DateFormat      string         `gorm:"size:32;default:'YYYY-MM-DD'"`
	FiscalYearStart string         `gorm:"size:5;default:'01-01'"`
	LogoURL         *string        `gorm:"type:text"`
	Website         *string        `gorm:"size:255"`
	Email           *string        `gorm:"size:255"`
	Phone           *string        `gorm:"size:32"`
	Address         *string        `gorm:"type:text"`
	Settings        datatypes.JSON `gorm:"type:jsonb;default:'{}'"`

	Locations []Location
	Users     []User
	Employees []Employee
}
