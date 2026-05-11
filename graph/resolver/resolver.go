package resolver

import "github.com/pawan_13g/hrms/internal/modules/masters/department"

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

type Resolver struct {
	DepartmentService department.Service
}
