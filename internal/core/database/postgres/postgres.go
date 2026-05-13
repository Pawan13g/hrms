package postgres

import (
	"context"
	"database/sql"
	"errors"
	"log"

	"github.com/pawan_13g/hrms/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(ctx context.Context, dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	pgPool, err := db.DB()
	if err != nil {
		return nil, err
	}
	if err := pgPool.Ping(); err != nil {
		pgPool.Close()
		return nil, err
	}

	err = db.AutoMigrate(
		&models.Gender{},
		&models.MaritalStatus{},
		&models.EmploymentType{},
		&models.EmploymentStatus{},
		&models.DocumentType{},
		&models.BankAccountType{},

		&models.Country{},
		&models.State{},
		&models.City{},

		&models.Tenant{},
		&models.Location{},

		&models.AppModule{},
		&models.Package{},
		&models.PackageModule{},
		&models.TenantSubscription{},

		&models.User{},
		&models.Role{},
		&models.Permission{},
		&models.RolePermission{},
		&models.UserRole{},

		&models.Department{},
		&models.Designation{},

		&models.Employee{},
		&models.EmployeeBankAccount{},
		&models.EmployeeDocument{},

		&models.CustomForm{},
		&models.CustomFormSection{},
		&models.CustomField{},
		&models.CustomFieldValue{},
	)

	if err != nil {
		log.Fatal("migration failed:", err)
	}

	return db, nil
}

func Ping(ctx context.Context, p *sql.DB) error {
	if p == nil {
		return errors.New("pg pool is nil")
	}
	return p.Ping()
}
