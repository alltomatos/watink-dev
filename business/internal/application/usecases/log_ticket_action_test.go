package usecases

import (
	"testing"

	"gorm.io/gorm"
)

func TestNewLogTicketActionUseCase_NotNil(t *testing.T) {
	uc := NewLogTicketActionUseCase(&gorm.DB{})
	if uc == nil {
		t.Fatal("NewLogTicketActionUseCase returned nil")
	}
}

func TestNewLogTicketActionUseCase_StoresDB(t *testing.T) {
	db := &gorm.DB{}
	uc := NewLogTicketActionUseCase(db)
	if uc.db != db {
		t.Fatal("expected stored db to match provided db")
	}
}
