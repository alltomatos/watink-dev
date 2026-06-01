package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestUpdateContactDoesNotAcceptTenantIDFromPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`CREATE TABLE "Contacts" (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		number TEXT,
		"profilePicUrl" TEXT,
		email TEXT NOT NULL DEFAULT '',
		"isGroup" BOOLEAN NOT NULL DEFAULT false,
		"tenantId" TEXT NOT NULL,
		lid TEXT,
		"walletUserId" INTEGER,
		"createdAt" DATETIME,
		"updatedAt" DATETIME
	)`).Error; err != nil {
		t.Fatal(err)
	}

	mockRepo := &MockContactRepo{db: db}
	controller := NewContactController(mockRepo)

	tenantA := uuid.New()
	tenantB := uuid.New()
	contact := models.Contact{Name: "Original", Number: "5511999999999", Email: "original@example.com", TenantID: tenantA}
	if err := db.Create(&contact).Error; err != nil {
		t.Fatal(err)
	}

	payload := map[string]interface{}{
		"id":       contact.ID + 1000,
		"name":     "Updated",
		"number":   "5511888888888",
		"email":    "updated@example.com",
		"tenantId": tenantB.String(),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}

	router := gin.New()
	router.PUT("/contacts/:contactId", func(c *gin.Context) {
		c.Set("tenantId", tenantA.String())
		c.Set("userProfile", "admin")
		controller.UpdateContact(c)
	})

	req := httptest.NewRequest(http.MethodPut, "/contacts/"+strconv.Itoa(contact.ID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", res.Code, res.Body.String())
	}

	var updated models.Contact
	if err := db.First(&updated, contact.ID).Error; err != nil {
		t.Fatal(err)
	}
	if updated.TenantID != tenantA {
		t.Fatalf("tenantId changed to %s", updated.TenantID)
	}
	if updated.ID != contact.ID {
		t.Fatalf("id changed to %d", updated.ID)
	}
	if updated.Name != "Updated" {
		t.Fatalf("name = %s", updated.Name)
	}
}

type MockContactRepo struct{ db *gorm.DB }

func (m *MockContactRepo) FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*domain.Contact, error) {
	var c models.Contact
	if err := m.db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&c).Error; err != nil {
		return nil, err
	}
	return &domain.Contact{ID: c.ID, Name: c.Name, TenantID: c.TenantID}, nil
}
func (m *MockContactRepo) Update(ctx context.Context, contact *domain.Contact, fields map[string]interface{}) error {
	return m.db.Model(&models.Contact{}).Where("id = ? AND \"tenantId\" = ?", contact.ID, contact.TenantID).Updates(fields).Error
}
func (m *MockContactRepo) Find(ctx context.Context, tenantID uuid.UUID, search string) ([]domain.Contact, error) {
	return nil, nil
}
func (m *MockContactRepo) FindByNumber(ctx context.Context, tenantID uuid.UUID, number string, isGroup bool) (*domain.Contact, error) {
	return nil, nil
}
func (m *MockContactRepo) FindByLID(ctx context.Context, tenantID uuid.UUID, lid string, isGroup bool) (*domain.Contact, error) {
	return nil, nil
}
func (m *MockContactRepo) FindOrCreate(ctx context.Context, tenantID uuid.UUID, number, pushName, profilePicUrl string, isGroup, isLid bool, lid string) (*domain.Contact, error) {
	return nil, nil
}
func (m *MockContactRepo) Create(ctx context.Context, contact *domain.Contact) error { return nil }
func (m *MockContactRepo) Delete(ctx context.Context, id int, tenantID uuid.UUID) error {
	return nil
}
