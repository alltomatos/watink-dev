package database

import (
	"fmt"
	"log"
	"os"

	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("Connected to database successfully")
}

func Migrate() {
	err := DB.AutoMigrate(
		&models.Plan{},
		&models.Tenant{},
		&models.User{},
		&models.Setting{},
		&models.Contact{},
		&models.Whatsapp{},
		&models.Queue{},
		&models.Ticket{},
		&models.Message{},
	)

	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	fmt.Println("Database migration completed")
}
