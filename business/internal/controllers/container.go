package controllers

import (
	"github.com/alltomatos/watinkdev/business/internal/application"
	"github.com/alltomatos/watinkdev/business/internal/database"
)

// InitContainer initializes the dependency injection container.
// Called once at startup in main.go.
func InitContainer() {
	// Legacy global variable removed in favor of DI injection
	// Use NewController(db) instead of relying on appContainer
	_ = application.NewContainer(database.DB)
}