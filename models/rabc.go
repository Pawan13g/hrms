package models

type Role struct {
	BaseModel
	StatusModel

	TenantID uint64
	Tenant   Tenant

	Name        string `gorm:"size:255;not null"`
	Code        string `gorm:"size:64"`
	Description string `gorm:"type:text"`
	IsSystem    bool   `gorm:"default:false"`

	Permissions []Permission `gorm:"many2many:role_permissions"`
}

type Permission struct {
	ID          uint64 `gorm:"primaryKey"`
	Key         string `gorm:"size:255;unique;not null"`
	ModuleCode  string `gorm:"size:100"`
	Description string `gorm:"type:text"`
}

type RolePermission struct {
	ID           uint64 `gorm:"primaryKey"`
	RoleID       uint64
	PermissionID uint64
}

type UserRole struct {
	ID     uint64 `gorm:"primaryKey"`
	UserID uint64
	RoleID uint64
}
