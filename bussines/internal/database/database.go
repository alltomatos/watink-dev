package database

import (
	"fmt"
	"log"
	"os"

	"github.com/alltomatos/watinkdev/bussines/internal/models"
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
		&models.TenantSubscription{},
		&models.User{},
		&models.Setting{},
		&models.Contact{},
		&models.Whatsapp{},
		&models.Queue{},
		&models.Ticket{},
		&models.Message{},
		&models.Group{},
		&models.Permission{},
		&models.Role{},
		&models.RolePermission{},
		&models.Flow{},
		&models.QuickAnswer{},
		&models.KnowledgeBase{},
		&models.KnowledgeBaseSource{},
		&models.Pipeline{},
		&models.PipelineStage{},
		&models.TagGroup{},
		&models.Tag{},
		&models.EntityTag{},
		&models.TicketLog{},
	)

	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	fmt.Println("Database migration completed")
	Seed()
}

func Seed() {
	// Seed Permissions
	permissions := []models.Permission{
		{Resource: "pipelines", Action: "view", Description: "Visualizar menu de Pipelines"},
		{Resource: "chats", Action: "view", Description: "Visualizar menu de Chats/Tickets"},
		{Resource: "admin", Action: "view", Description: "Visualizar menu de Administração"},
		{Resource: "queues", Action: "view", Description: "Gerenciar Filas (Admin)"},
		{Resource: "settings", Action: "view", Description: "Gerenciar Configurações (Admin)"},
		{Resource: "groups", Action: "view", Description: "Gerenciar Grupos de Usuários"},
		{Resource: "users", Action: "view", Description: "Gerenciar Usuários"},
		{Resource: "view", Action: "swagger", Description: "Visualizar documentação Swagger"},
	}

	for _, p := range permissions {
		DB.FirstOrCreate(&p, models.Permission{Resource: p.Resource, Action: p.Action})
	}

	fmt.Println("Database seeding completed")
}
