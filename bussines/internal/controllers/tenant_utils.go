package controllers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func tenantUUIDFromContext(c *gin.Context) (uuid.UUID, error) {
	v, ok := c.Get("tenantId")
	if !ok || v == nil {
		return uuid.Nil, errors.New("tenantId not found")
	}

	switch t := v.(type) {
	case uuid.UUID:
		return t, nil
	case string:
		id, err := uuid.Parse(t)
		if err != nil {
			return uuid.Nil, err
		}
		return id, nil
	default:
		return uuid.Nil, errors.New("invalid tenantId type")
	}
}
