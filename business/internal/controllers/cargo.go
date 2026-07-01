package controllers

import (
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"gorm.io/gorm"
)

// CargoController manages Cargos (ADR 0022) — o container de Permissions que
// define o que um User pode fazer. Tenant-scoped via auth.GetScoped, no mesmo
// padrão de ProxyGroupController (struct sem estado, sem dependência de
// Container — o DB efetivo vem sempre do contexto Gin via auth.GetScoped).
type CargoController struct{}

func NewCargoController() *CargoController { return &CargoController{} }

// cargoInput is the Create/Update payload. PermissionIDs is a pointer to a
// slice so we can tell "campo ausente" (nil) de "campo enviado vazio" ([]) —
// necessário para o partial-update do Update (ver ShouldBindBodyWith abaixo).
type cargoInput struct {
	Name          string `json:"name"`
	Description   string `json:"description"`
	PermissionIDs *[]int `json:"permissionIds"`
}

// loadCargoPermissionsLocal replica business/internal/infrastructure/repository/gorm_user_repo.go
// (função loadCargoPermissions, minúscula/não-exportada). Não é possível
// importar essa função do pacote controllers: ela vive em
// internal/infrastructure/repository, e mesmo se estivesse exportada,
// controllers não depende desse pacote hoje (evitar acoplamento cruzado
// só para reaproveitar uma query de 6 linhas). Mesma duplicação de padrão já
// aceita no projeto para CargoPermissao/attachCargoPermissions (ver abaixo).
func loadCargoPermissionsLocal(db *gorm.DB, cargoID int) ([]models.Permission, error) {
	var perms []models.Permission
	err := db.
		Table(`"Permissions"`).
		Joins(`JOIN cargo_permissoes ON cargo_permissoes."permissionId" = "Permissions".id`).
		Where(`cargo_permissoes."cargoId" = ?`, cargoID).
		Find(&perms).Error
	return perms, err
}

// attachCargoPermissionsLocal replica business/internal/services/setup_service.go
// (função attachCargoPermissions, minúscula/não-exportada, pacote internal/services).
// Mesmo motivo do helper acima: não é importável de controllers sem criar uma
// dependência services->controllers (ou vice-versa) só para uma inserção em
// lote de 5 linhas. Mantém o mesmo padrão: usa models.CargoPermissao
// explicitamente, nunca Association() do GORM (ver comentário em cargo.go /
// models/cargo.go sobre por que a junção é manual).
func attachCargoPermissionsLocal(tx *gorm.DB, cargoID int, permissionIDs []int) error {
	if len(permissionIDs) == 0 {
		return nil
	}
	rows := make([]models.CargoPermissao, len(permissionIDs))
	for i, pid := range permissionIDs {
		rows[i] = models.CargoPermissao{CargoID: cargoID, PermissionID: pid}
	}
	return tx.Create(&rows).Error
}

// List returns the tenant's Cargos without populating Permissions (listing
// view only needs id/name/description/isSystem — matriz de permissões é
// carregada só no Show/edição).
// @Summary      Listar cargos
// @Tags         cargos
// @Produce      json
// @Success      200  {array}   models.Cargo
// @Security     BearerAuth
// @Router       /cargos [get]
func (cc *CargoController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Cargos")
	if !ok {
		return
	}
	var cargos []models.Cargo
	if err := db.Where(`"tenantId" = ?`, tenantID).Order("id").Find(&cargos).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListCargos")
		return
	}
	c.JSON(http.StatusOK, cargos)
}

// Show details a single Cargo with its Permissions populated.
// @Summary      Detalhar cargo
// @Tags         cargos
// @Produce      json
// @Param        cargoId  path  int  true  "ID do cargo"
// @Success      200  {object}  models.Cargo
// @Security     BearerAuth
// @Router       /cargos/{cargoId} [get]
func (cc *CargoController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Cargos")
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("cargoId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cargoId inválido"})
		return
	}
	var cargo models.Cargo
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&cargo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cargo não encontrado"})
		return
	}
	// Session(NewDB:true): o db acima já rodou um First() — reusar sem reset
	// arrisca acumular condição da query anterior (mesma armadilha documentada
	// em proxy_group.go/ADR do subsistema de proxy).
	perms, err := loadCargoPermissionsLocal(db.Session(&gorm.Session{NewDB: true}), cargo.ID)
	if err != nil {
		utils.RespondWithInternalError(c, err, "LoadCargoPermissions")
		return
	}
	cargo.Permissions = perms
	c.JSON(http.StatusOK, cargo)
}

// Create inserts a Cargo scoped to the caller's tenant. TenantID always comes
// from the auth context — never trust a tenantId in the payload (mass-assignment).
// @Summary      Criar cargo
// @Tags         cargos
// @Accept       json
// @Produce      json
// @Success      201  {object}  models.Cargo
// @Security     BearerAuth
// @Router       /cargos [post]
func (cc *CargoController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Cargos")
	if !ok {
		return
	}
	var in cargoInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	name, err := utils.ValidateStringField(in.Name, "name", 120)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name é obrigatório"})
		return
	}
	description, err := utils.ValidateStringField(in.Description, "description", 500)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cargo := models.Cargo{
		Name:        name,
		Description: description,
		TenantID:    tenantID, // NUNCA do payload — mass-assignment.
	}
	if err := db.Create(&cargo).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateCargo")
		return
	}
	c.JSON(http.StatusCreated, cargo)
}

// Update edits name/description and, optionally, replaces the Cargo's
// Permission set. PUT parcial por design (mesmo padrão de
// WhatsappController.UpdateWhatsapp): bind duplo — struct para valores +
// map cru para saber quais chaves realmente vieram no body. Sem o raw map,
// "permissionIds" ausente e "permissionIds": [] são indistinguíveis no
// struct (ambos viram slice nil/vazio), e um PUT só de name apagaria as
// permissions do cargo silenciosamente.
// @Summary      Atualizar cargo
// @Tags         cargos
// @Accept       json
// @Produce      json
// @Param        cargoId  path  int  true  "ID do cargo"
// @Success      200  {object}  models.Cargo
// @Security     BearerAuth
// @Router       /cargos/{cargoId} [put]
func (cc *CargoController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Cargos")
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("cargoId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cargoId inválido"})
		return
	}
	var cargo models.Cargo
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&cargo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cargo não encontrado"})
		return
	}

	var in cargoInput
	if err := c.ShouldBindBodyWith(&in, binding.JSON); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	var raw map[string]interface{}
	_ = c.ShouldBindBodyWith(&raw, binding.JSON) // mesmo body, cacheado pelo Gin

	fields := map[string]interface{}{}
	if _, sent := raw["name"]; sent {
		name, err := utils.ValidateStringField(in.Name, "name", 120)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "name não pode ser vazio"})
			return
		}
		fields["name"] = name
	}
	if _, sent := raw["description"]; sent {
		description, err := utils.ValidateStringField(in.Description, "description", 500)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		fields["description"] = description
	}

	// permissionIds: só mexe se a CHAVE veio no body (raw), nunca por o
	// ponteiro estar nil — replace completo (delete+insert), não merge.
	_, permsSent := raw["permissionIds"]
	var newPermissionIDs []int
	if permsSent && in.PermissionIDs != nil {
		newPermissionIDs = *in.PermissionIDs
		// Valida que todo permissionId existe no catálogo global ANTES de
		// aplicar qualquer coisa — se algum não existir, 400 sem tocar no banco.
		if len(newPermissionIDs) > 0 {
			var count int64
			if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Permission{}).
				Where("id IN ?", newPermissionIDs).Count(&count).Error; err != nil {
				utils.RespondWithInternalError(c, err, "ValidatePermissionIDs")
				return
			}
			if int(count) != len(uniqueInts(newPermissionIDs)) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "um ou mais permissionIds não existem no catálogo"})
				return
			}
		}
	}

	err = db.Session(&gorm.Session{NewDB: true}).Transaction(func(tx *gorm.DB) error {
		if len(fields) > 0 {
			if err := tx.Model(&models.Cargo{}).
				Where(`id = ? AND "tenantId" = ?`, id, tenantID).
				Updates(fields).Error; err != nil {
				return err
			}
		}
		if permsSent {
			if err := tx.Where(`"cargoId" = ?`, id).Delete(&models.CargoPermissao{}).Error; err != nil {
				return err
			}
			if err := attachCargoPermissionsLocal(tx, id, newPermissionIDs); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		utils.RespondWithInternalError(c, err, "UpdateCargo")
		return
	}

	// Reload with fresh session (a transação acima já fechou; db original
	// pode ter condição acumulada do First() feito no topo do handler).
	fresh := db.Session(&gorm.Session{NewDB: true})
	if err := fresh.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&cargo).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ReloadCargo")
		return
	}
	if permsSent {
		perms, err := loadCargoPermissionsLocal(fresh.Session(&gorm.Session{NewDB: true}), cargo.ID)
		if err != nil {
			utils.RespondWithInternalError(c, err, "LoadCargoPermissions")
			return
		}
		cargo.Permissions = perms
	}
	c.JSON(http.StatusOK, cargo)
}

// Delete removes a Cargo, blocked (409) if:
//  1. it is the sole "Administrador" Cargo of the tenant (anti-lockout,
//     ADR 0022 — o tenant nunca pode ficar sem capacidade de ter um Admin), OR
//  2. any User in the tenant still points at it via CargoID (não deleta em
//     cascata silenciosamente — exige reatribuir os usuários primeiro).
//
// @Summary      Excluir cargo
// @Tags         cargos
// @Produce      json
// @Param        cargoId  path  int  true  "ID do cargo"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /cargos/{cargoId} [delete]
func (cc *CargoController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Cargos")
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("cargoId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cargoId inválido"})
		return
	}
	var cargo models.Cargo
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&cargo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cargo não encontrado"})
		return
	}

	fresh := db.Session(&gorm.Session{NewDB: true})

	if cargo.Name == "Administrador" {
		var adminCount int64
		if err := fresh.Session(&gorm.Session{NewDB: true}).Model(&models.Cargo{}).
			Where(`"tenantId" = ? AND name = ?`, tenantID, "Administrador").
			Count(&adminCount).Error; err != nil {
			utils.RespondWithInternalError(c, err, "CountAdminCargos")
			return
		}
		if adminCount <= 1 {
			c.JSON(http.StatusConflict, gin.H{"error": "não é possível excluir o único Cargo Administrador do tenant"})
			return
		}
	}

	var usersInUse int64
	if err := fresh.Session(&gorm.Session{NewDB: true}).Model(&models.User{}).
		Where(`"tenantId" = ? AND "cargoId" = ?`, tenantID, id).
		Count(&usersInUse).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CountUsersWithCargo")
		return
	}
	if usersInUse > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "não é possível excluir um Cargo em uso — reatribua os usuários primeiro"})
		return
	}

	err = fresh.Session(&gorm.Session{NewDB: true}).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where(`"cargoId" = ?`, id).Delete(&models.CargoPermissao{}).Error; err != nil {
			return err
		}
		res := tx.Where(`id = ? AND "tenantId" = ?`, id, tenantID).Delete(&models.Cargo{})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "cargo não encontrado"})
			return
		}
		utils.RespondWithInternalError(c, err, "DeleteCargo")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cargo removido"})
}

// ListPermissionsCatalog returns the GLOBAL Permission catalog (no tenant
// filter — Permission é dado de referência compartilhado, não tenant-scoped;
// ver models/permission.go). Agrupado por Resource: formato mais direto para
// a UI montar a matriz recurso×ação na tela de edição de Cargo sem precisar
// re-agrupar no frontend (escolha de formato — ver relatório final).
// @Summary      Catálogo global de permissions
// @Tags         cargos
// @Produce      json
// @Success      200  {object}  map[string][]models.Permission
// @Security     BearerAuth
// @Router       /cargos/catalog/permissions [get]
func (cc *CargoController) ListPermissionsCatalog(c *gin.Context) {
	// Só precisa de tenant válido no contexto (rota autenticada) — o dado em
	// si não é filtrado por tenant, então usamos GetDB puro, não GetScoped.
	if _, err := auth.TenantUUIDFromContext(c); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, err, "Invalid tenant context")
		return
	}
	db := auth.GetDB(c)
	var perms []models.Permission
	if err := db.Order("resource, action").Find(&perms).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListPermissionsCatalog")
		return
	}
	grouped := make(map[string][]models.Permission)
	for _, p := range perms {
		grouped[p.Resource] = append(grouped[p.Resource], p)
	}
	c.JSON(http.StatusOK, grouped)
}

// uniqueInts returns the count of distinct ints — usado para validar que
// "IN (?)" bateu 1:1 com a lista pedida (repetições no payload não devem
// mascarar um ID inexistente na contagem).
func uniqueInts(xs []int) []int {
	seen := make(map[int]struct{}, len(xs))
	out := make([]int, 0, len(xs))
	for _, x := range xs {
		if _, ok := seen[x]; !ok {
			seen[x] = struct{}{}
			out = append(out, x)
		}
	}
	return out
}

// ============================================================================
// Rotas (documentação — routes.go NÃO foi editado neste GAP; adicionar):
//
//   cargoController := controllers.NewCargoController()
//
//   protected.GET("/cargos", cargoController.List)
//   protected.GET("/cargos/catalog/permissions", cargoController.ListPermissionsCatalog)
//   protected.GET("/cargos/:cargoId", cargoController.Show)
//   protected.POST("/cargos", cargoController.Create)
//   protected.PUT("/cargos/:cargoId", cargoController.Update)
//   protected.DELETE("/cargos/:cargoId", cargoController.Delete)
//
// IMPORTANTE: registrar "/cargos/catalog/permissions" ANTES de
// "/cargos/:cargoId" no grupo de rotas — Gin resolve por ordem de registro
// quando há conflito entre path estático e path com parâmetro no mesmo nível.
//
// Container (application/container.go): CargoController não precisa de
// entrada no Container — não tem estado nem dependência injetada (mesmo
// padrão de ProxyGroupController, instanciado direto em routes.go via
// controllers.NewCargoController()).
//
// Enforcement (ADR 0022, fora de escopo deste GAP): rotas de escrita
// (POST/PUT/DELETE) deverão ganhar RequirePermission("cargos", "manage")
// quando o middleware de enforcement faseado chegar em /cargos — não
// implementado aqui (este GAP só cobre o CRUD).
// ============================================================================
