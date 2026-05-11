package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uint64         `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

type StatusModel struct {
	Status string `gorm:"type:varchar(50);default:'active'" json:"status"`
}

type JSONB = datatypes.JSON
