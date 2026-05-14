package resolver

import (
	"github.com/pawan13g/hrms/internal/modules/auth"
	"github.com/pawan13g/hrms/internal/modules/masters/department"
	"github.com/pawan13g/hrms/internal/modules/masters/geography"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

type Resolver struct {
	DepartmentService department.Service
	GeographyService  geography.Service
	AuthService       auth.Service
}
