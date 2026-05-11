package models

import (
	"time"

	"gorm.io/datatypes"
)

type Employee struct {
	BaseModel
	StatusModel

	TenantID uint64
	Tenant   Tenant

	UserID *uint64
	User   *User

	EmployeeCode string `gorm:"size:64;not null"`

	FirstName  string `gorm:"size:128;not null"`
	MiddleName string `gorm:"size:128"`
	LastName   string `gorm:"size:128;not null"`

	DateOfBirth *time.Time

	GenderID *uint64
	Gender   *Gender

	MaritalStatusID *uint64
	MaritalStatus   *MaritalStatus

	Nationality string `gorm:"size:64"`

	Email          string `gorm:"size:255;not null"`
	PersonalEmail  string `gorm:"size:255"`
	Phone          string `gorm:"size:32"`
	AlternatePhone string `gorm:"size:32"`
	Address        string `gorm:"type:text"`

	CityID *uint64
	City   *City

	PostalCode string `gorm:"size:32"`

	DepartmentID *uint64
	Department   *Department

	DesignationID *uint64
	Designation   *Designation

	LocationID *uint64
	Location   *Location

	EmploymentTypeID uint64
	EmploymentType   EmploymentType

	EmploymentStatusID uint64
	EmploymentStatus   EmploymentStatus

	HireDate        time.Time
	JoiningDate     time.Time
	TerminationDate *time.Time

	NoticePeriodDays int `gorm:"default:30"`

	ReportingManagerID *uint64
	ReportingManager   *Employee

	ProfilePictureURL string

	EmergencyContacts datatypes.JSON `gorm:"type:jsonb;default:'[]'"`

	BankAccounts []EmployeeBankAccount
	Documents    []EmployeeDocument
}

type DocumentType struct {
	BaseModel
	StatusModel

	Code string `gorm:"size:64;unique;not null"`
	Name string `gorm:"size:255;not null"`
}

type Gender struct {
	BaseModel
	StatusModel

	Code string `gorm:"size:50;unique;not null"`
	Name string `gorm:"size:100;not null"`
}

type MaritalStatus struct {
	BaseModel
	StatusModel

	Code string `gorm:"size:50;unique;not null"`
	Name string `gorm:"size:100;not null"`
}

type BankAccountType struct {
	BaseModel
	StatusModel

	Code string `gorm:"size:50;unique;not null"`
	Name string `gorm:"size:100;not null"`
}

type EmploymentType struct {
	BaseModel
	StatusModel

	Code string `gorm:"size:50;unique;not null"`
	Name string `gorm:"size:100;not null"`
}

type EmploymentStatus struct {
	BaseModel
	StatusModel

	Code string `gorm:"size:50;unique;not null"`
	Name string `gorm:"size:100;not null"`
}

type EmployeeBankAccount struct {
	BaseModel
	StatusModel

	EmployeeID uint64
	Employee   Employee

	AccountHolderName string `gorm:"size:255;not null"`
	BankName          string `gorm:"size:255;not null"`
	AccountNumber     string `gorm:"size:128;not null"`

	RoutingNumber string `gorm:"size:64"`
	SwiftCode     string `gorm:"size:32"`
	IBAN          string `gorm:"size:64"`
	IFSCCode      string `gorm:"size:32"`
	BranchName    string `gorm:"size:255"`

	AccountTypeID *uint64
	AccountType   *BankAccountType

	CurrencyCode string `gorm:"size:3;not null"`
	IsPrimary    bool   `gorm:"default:false"`
}

type EmployeeDocument struct {
	BaseModel
	StatusModel

	TenantID uint64
	Tenant   Tenant

	EmployeeID uint64
	Employee   Employee

	DocumentTypeID uint64
	DocumentType   DocumentType

	DocumentName   string `gorm:"size:255;not null"`
	DocumentNumber string `gorm:"size:128"`

	FileURL       string `gorm:"type:text;not null"`
	FileSizeBytes int64
	MimeType      string `gorm:"size:128"`

	IssueDate  *time.Time
	ExpiryDate *time.Time

	IsVerified bool `gorm:"default:false"`

	VerifiedBy *uint64
	Notes      string `gorm:"type:text"`
}

func (EmploymentType) TableName() string {
	return "employment_types"
}

func (Gender) TableName() string {
	return "gender"
}
