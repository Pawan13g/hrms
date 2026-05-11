package models

import "gorm.io/datatypes"

type CustomForm struct {
	BaseModel
	StatusModel

	Code         string `gorm:"size:64;not null"`
	TenantID     uint64
	Tenant       Tenant
	Name         string `gorm:"size:255;not null"`
	Description  string `gorm:"type:text"`
	DisplayOrder int
	IsSystem     bool `gorm:"default:false"`

	Sections []CustomFormSection `gorm:"foreignKey:FormID"`
	Fields   []CustomField       `gorm:"foreignKey:FormID"`
}

type CustomFormSection struct {
	BaseModel
	StatusModel

	TenantID uint64

	FormID uint64
	Form   CustomForm

	SectionKey   string `gorm:"size:255;not null"`
	SectionLabel string `gorm:"size:255;not null"`

	Description string `gorm:"type:text"`

	DisplayOrder  int
	IsCollapsible bool
	IsCollapsed   bool
}

type CustomField struct {
	BaseModel
	StatusModel

	TenantID uint64

	FormID uint64
	Form   CustomForm

	SectionID *uint64
	Section   *CustomFormSection

	FieldKey     string `gorm:"size:255;not null"`
	FieldLabel   string `gorm:"size:255"`
	DataType     string `gorm:"size:50;not null"`
	IsRequired   bool
	DisplayOrder int

	ValidationJSON datatypes.JSON `gorm:"type:jsonb"`
}

type CustomFieldValue struct {
	ID uint64 `gorm:"primaryKey"`

	FieldID uint64
	Field   CustomField

	EntityType string `gorm:"size:64;not null"`
	EntityID   uint64

	FieldValue string `gorm:"type:text"`
}
