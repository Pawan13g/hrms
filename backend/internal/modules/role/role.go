package role

import "time"

type Role struct {
	ID          int64
	TenantID    int64
	Name        string
	Description *string
	IsSystem    bool
	Status      string
	CreatedAt   time.Time
	Permissions []Permission
	UserCount   int
}

type Permission struct {
	ID          int64
	Key         string
	Description *string
}

type UserRole struct {
	UserID   int64
	RoleID   int64
	RoleName string
}

type RoleUser struct {
	UserID int64
	Email  string
}

type CreateInput struct {
	Name          string
	Description   *string
	PermissionIDs []int64
}

type UpdateInput struct {
	Name        *string
	Description *string
	Status      *string
}
