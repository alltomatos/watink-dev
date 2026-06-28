package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/gin-gonic/gin"
)

// StorageController expõe o status (não sensível) do object store aos superadmins,
// para confirmarem que o armazenamento de arquivos da Base de Conhecimento está
// configurado e para qual backend aponta (MinIO dev → R2/AWS prod). Read-only — a
// configuração do S3 é feita via variáveis de ambiente `S3_*`.
type StorageController struct {
	store domain.ObjectStore
}

func NewStorageController(store domain.ObjectStore) *StorageController {
	return &StorageController{store: store}
}

// @Summary      Status do armazenamento de objetos (S3)
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /system/storage [get]
func (sc *StorageController) Status(c *gin.Context) {
	if sc.store == nil {
		c.JSON(http.StatusOK, gin.H{"configured": false})
		return
	}
	resp := gin.H{"configured": true, "driver": "s3-compatible"}
	for k, v := range sc.store.Describe() {
		resp[k] = v
	}
	c.JSON(http.StatusOK, resp)
}
