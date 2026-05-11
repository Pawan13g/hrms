package models

type User struct {
	BaseModel
	StatusModel

	TenantID uint64
	Tenant   Tenant

	Email        string `gorm:"size:255;not null"`
	PasswordHash string `gorm:"type:text;not null"`
	FirstName    string `gorm:"size:128"`
	LastName     string `gorm:"size:128"`
	Phone        string `gorm:"size:32"`

	Roles []Role `gorm:"many2many:user_roles"`
}
