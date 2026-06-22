package controllers

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/mock"
)

func TestContactController_SyncContact_ContactNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupContactTestDB(t)

	sessions := &MockChannelSessionRepo{}
	pub := &mockPublisher{}
	ctrl := NewContactController(&MockContactRepo{db: db}, sessions, pub)

	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID.String()))
	r.POST("/contacts/:contactId/sync", ctrl.SyncContact)

	req := httptest.NewRequest(http.MethodPost, "/contacts/99999/sync", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
	if pub.called {
		t.Fatal("publisher should not be called when contact not found")
	}
}

func TestContactController_SyncContact_NoConnectedSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupContactTestDB(t)

	contact := models.Contact{Name: "Test", Number: "5511999999999", TenantID: tenantID}
	if err := db.Create(&contact).Error; err != nil {
		t.Fatal(err)
	}

	sessions := &MockChannelSessionRepo{}
	sessions.On("FindAll", mock.Anything, tenantID).Return([]domain.ChannelSession{
		{ID: 1, Status: "DISCONNECTED", TenantID: tenantID},
	}, nil)
	pub := &mockPublisher{}
	ctrl := NewContactController(&MockContactRepo{db: db}, sessions, pub)

	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID.String()))
	r.POST("/contacts/:contactId/sync", ctrl.SyncContact)

	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/contacts/%d/sync", contact.ID), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %s", w.Code, w.Body.String())
	}
	if pub.called {
		t.Fatal("publisher should not be called when no connected session exists")
	}
}

func TestContactController_SyncContact_PublishesCommand(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupContactTestDB(t)

	contact := models.Contact{Name: "Test", Number: "5511999999999", TenantID: tenantID}
	if err := db.Create(&contact).Error; err != nil {
		t.Fatal(err)
	}

	sessions := &MockChannelSessionRepo{}
	sessions.On("FindAll", mock.Anything, tenantID).Return([]domain.ChannelSession{
		{ID: 3, Status: "CONNECTED", TenantID: tenantID},
	}, nil)
	pub := &mockPublisher{}
	ctrl := NewContactController(&MockContactRepo{db: db}, sessions, pub)

	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID.String()))
	r.POST("/contacts/:contactId/sync", ctrl.SyncContact)

	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/contacts/%d/sync", contact.ID), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", w.Code, w.Body.String())
	}
	if !pub.called {
		t.Fatal("publisher should be called for a connected session")
	}
	want := "wbot." + tenantID.String() + ".3.contact.sync"
	if pub.routingKey != want {
		t.Fatalf("routing key = %q, want %q", pub.routingKey, want)
	}
}
