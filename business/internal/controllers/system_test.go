package controllers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockSystemRepo implements domain.SystemRepository for testing.
type mockSystemRepo struct {
	consumption []domain.TenantConsumption
	err         error
}

func (m *mockSystemRepo) GetTenantConsumption(_ context.Context) ([]domain.TenantConsumption, error) {
	return m.consumption, m.err
}

// mockRabbitMQ implements SystemRabbitMQInterface for testing.
type mockRabbitMQ struct {
	connected bool
	queues    []domain.QueueMetrics
	err       error
}

func (m *mockRabbitMQ) IsConnected() bool { return m.connected }
func (m *mockRabbitMQ) ListAllQueues() ([]domain.QueueMetrics, error) {
	return m.queues, m.err
}

func TestSystemController_GetSystemStats_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &mockSystemRepo{
		consumption: []domain.TenantConsumption{
			{TenantID: "t1", TenantName: "Acme", Users: 3},
		},
	}
	rabbit := &mockRabbitMQ{
		connected: true,
		queues:    []domain.QueueMetrics{{Name: "q1", Messages: 5}},
	}

	ctrl := NewSystemController(repo, rabbit)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/system/stats", nil)
	c.Request = req

	ctrl.GetSystemStats(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var stats map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &stats))
	assert.NotNil(t, stats["timestamp"])
	// tenantConsumption should contain 1 entry
	tc, ok := stats["tenantConsumption"].([]interface{})
	assert.True(t, ok)
	assert.Len(t, tc, 1)
	assert.True(t, stats["rabbitmq"].(map[string]interface{})["connected"].(bool))
}

func TestSystemController_GetSystemStats_NoRabbit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &mockSystemRepo{}
	ctrl := NewSystemController(repo, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/system/stats", nil)
	c.Request = req

	ctrl.GetSystemStats(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestSystemController_GetRabbitMQQueues_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rabbit := &mockRabbitMQ{
		connected: true,
		queues:    []domain.QueueMetrics{{Name: "watink.messages", Messages: 10}},
	}
	ctrl := NewSystemController(&mockSystemRepo{}, rabbit)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/system/rabbitmq/queues", nil)
	c.Request = req

	ctrl.GetRabbitMQQueues(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.True(t, resp["connected"].(bool))
	assert.Equal(t, float64(1), resp["total"])
}

func TestSystemController_GetRabbitMQQueues_NotInitialized(t *testing.T) {
	gin.SetMode(gin.TestMode)

	ctrl := NewSystemController(&mockSystemRepo{}, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/system/rabbitmq/queues", nil)
	c.Request = req

	ctrl.GetRabbitMQQueues(c)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestSystemController_GetRabbitMQQueues_ListError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rabbit := &mockRabbitMQ{connected: true, err: errors.New("amqp error")}
	ctrl := NewSystemController(&mockSystemRepo{}, rabbit)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/system/rabbitmq/queues", nil)
	c.Request = req

	ctrl.GetRabbitMQQueues(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
