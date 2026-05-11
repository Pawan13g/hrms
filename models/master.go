package models

type City struct {
	BaseModel
	StatusModel

	StateID uint64
	State   State

	Name string `gorm:"size:255;not null"`
	Code string `gorm:"size:10"`
}

type Country struct {
	BaseModel
	StatusModel

	Code                string  `gorm:"size:3;unique;not null"`
	Name                string  `gorm:"size:255;not null"`
	ISOCode             *string `gorm:"size:3"`
	CurrencyCode        string  `gorm:"size:3;not null"`
	CurrencySymbol      *string `gorm:"size:10"`
	PhoneCode           *string `gorm:"size:10"`
	Timezone            *string `gorm:"size:64"`
	DateFormat          string  `gorm:"size:32;default:'YYYY-MM-DD'"`
	FiscalYearStart     string  `gorm:"size:5;default:'01-01'"`
	WorkingHoursPerWeek float64 `gorm:"type:numeric(5,2);default:40.00"`

	States []State
}

type State struct {
	BaseModel
	StatusModel

	CountryID uint64
	Country   Country

	Name string `gorm:"size:255;not null"`
	Code string `gorm:"size:10"`

	Cities []City
}

type Department struct {
	BaseModel
	StatusModel

	TenantID uint64
	Tenant   Tenant

	Name string  `gorm:"size:255;not null"`
	Code *string `gorm:"size:64"`

	ParentDepartmentID *uint64
	ParentDepartment   *Department

	DepartmentHeadID *uint64

	Description *string `gorm:"type:text"`
}

type Designation struct {
	BaseModel
	StatusModel

	TenantID uint64
	Tenant   Tenant

	Name        string `gorm:"size:255;not null"`
	Code        string `gorm:"size:64"`
	Level       *int
	Description string `gorm:"type:text"`
}

type Location struct {
	BaseModel
	StatusModel

	TenantID uint64
	Tenant   Tenant

	Name string  `gorm:"size:255;not null"`
	Code *string `gorm:"size:64"`

	CountryID *uint64
	Country   *Country

	StateID *uint64
	State   *State

	CityID *uint64
	City   *City

	Address        *string `gorm:"type:text"`
	PostalCode     *string `gorm:"size:32"`
	Phone          *string `gorm:"size:32"`
	Email          *string `gorm:"size:255"`
	Timezone       *string `gorm:"size:64"`
	IsHeadquarters bool    `gorm:"default:false"`
}
