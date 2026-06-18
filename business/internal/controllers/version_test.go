package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVersionController_GetVersion_ServiceName(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewVersionController(nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/version", nil)
	c.Request = req

	ctrl.GetVersion(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var body map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "watink-business", body["service"])
	assert.Equal(t, "1.3.197", body["version"])
}

func TestVersionController_GetRabbitMQVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewVersionController(nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/version/rabbitmq", nil)
	c.Request = req

	ctrl.GetRabbitMQVersion(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var body map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "rabbitmq", body["service"])
	assert.NotEmpty(t, body["version"])
	assert.NotEmpty(t, body["lastUpdated"])
}

func TestVersionController_GetRedisVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewVersionController(nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/version/redis", nil)
	c.Request = req

	ctrl.GetRedisVersion(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var body map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "redis", body["service"])
	assert.NotEmpty(t, body["version"])
}
