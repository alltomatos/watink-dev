package main

import (
	"log"
	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	database.Connect()
	database.Migrate()
	log.Println("Migration and Seed finished successfully")
}
