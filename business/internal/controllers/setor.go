package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SetorController manages Setores (organizational sectors/departments) —
// substitui Group (ADR 0022). Tenant-scoped via auth.GetScoped(c, "Setores").
// Segue o mesmo padrão de ProxyGroupController/ConnectionGroupController
// (CRUD de "group" tenant-scoped com membros) e QueueController (CRUD
// simples tenant-scoped): construtor sem dependências — o *gorm.DB chega
// por request via auth.GetScoped, nunca injetado no construtor.
type SetorController struct{}

func NewSetorController() *SetorController { return &SetorController{} }

type setorInput struct {
	Name string `json:"name"`
}

type addMemberInput struct {
	UserID   int  `json:"userId"`
	EhGestor bool `json:"ehGestor"`
}

type updateMemberInput struct {
	EhGestor bool `json:"ehGestor"`
}

type setQueuesInput struct {
	QueueIDs []int `json:"queueIds"`
}

// List returns the tenant's Setores with member/manager counts.
// @Summary      Listar setores
// @Tags         setores
// @Produce      json
// @Success      200  {array}  map[string]interface{}
// @Security     BearerAuth
// @Router       /setores [get]
func (sc *SetorController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Setores")
	if !ok {
		return
	}
	var setores []models.Setor
	if err := db.Where(`"tenantId" = ?`, tenantID).Order("id DESC").Find(&setores).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListSetores")
		return
	}

	// Uma única query agregada para membros/gestores por Setor — evita N+1
	// para a lista (dezenas de setores por tenant). Session(NewDB:true):
	// o Find(&setores) acima poluiu o db escopado; sem reset esta agregação
	// herda as condições anteriores e retorna 0 (ver reference_gorm_getscoped_newdb).
	type countRow struct {
		SetorID  int
		Total    int64
		Gestores int64
	}
	var counts []countRow
	db.Session(&gorm.Session{NewDB: true}).Model(&models.UserSetor{}).
		Select(`"setorId" as setor_id, COUNT(*) as total, COUNT(*) FILTER (WHERE "ehGestor" = true) as gestores`).
		Where(`"setorId" IN (?)`, db.Session(&gorm.Session{NewDB: true}).Model(&models.Setor{}).
			Where(`"tenantId" = ?`, tenantID).Select("id")).
		Group(`"setorId"`).
		Scan(&counts)
	totalBySetor := make(map[int]int64, len(counts))
	gestoresBySetor := make(map[int]int64, len(counts))
	for _, r := range counts {
		totalBySetor[r.SetorID] = r.Total
		gestoresBySetor[r.SetorID] = r.Gestores
	}

	resp := make([]gin.H, len(setores))
	for i, s := range setores {
		resp[i] = gin.H{
			"id": s.ID, "name": s.Name, "tenantId": s.TenantID,
			"createdAt": s.CreatedAt, "updatedAt": s.UpdatedAt,
			"memberCount": totalBySetor[s.ID],
			"gestorCount": gestoresBySetor[s.ID],
		}
	}
	c.JSON(http.StatusOK, resp)
}

// Show details a single Setor: members (with name/email/ehGestor) and linked Queues.
// @Summary      Detalhar setor
// @Tags         setores
// @Produce      json
// @Param        setorId  path  int  true  "ID do setor"
// @Success      200  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /setores/{setorId} [get]
func (sc *SetorController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Setores")
	if !ok {
		return
	}
	setorID, ok := utils.ParseIntParam(c, "setorId")
	if !ok {
		return
	}

	var setor models.Setor
	if err := db.Where(`id = ? AND "tenantId" = ?`, setorID, tenantID).First(&setor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "setor não encontrado"})
		return
	}

	type memberRow struct {
		UserID   int
		Name     string
		Email    string
		EhGestor bool
	}
	var members []memberRow
	db.Session(&gorm.Session{NewDB: true}).Table("user_setores AS us").
		Select(`us."userId" as user_id, u.name as name, u.email as email, us."ehGestor" as eh_gestor`).
		Joins(`JOIN "Users" u ON u.id = us."userId"`).
		Where(`us."setorId" = ?`, setorID).
		Scan(&members)

	type queueRow struct {
		QueueID int
		Name    string
	}
	var queues []queueRow
	db.Session(&gorm.Session{NewDB: true}).Table("setor_filas AS sf").
		Select(`sf."queueId" as queue_id, q.name as name`).
		Joins(`JOIN "Queues" q ON q.id = sf."queueId"`).
		Where(`sf."setorId" = ?`, setorID).
		Scan(&queues)

	membersResp := make([]gin.H, len(members))
	for i, m := range members {
		membersResp[i] = gin.H{"userId": m.UserID, "name": m.Name, "email": m.Email, "ehGestor": m.EhGestor}
	}
	queuesResp := make([]gin.H, len(queues))
	for i, q := range queues {
		queuesResp[i] = gin.H{"queueId": q.QueueID, "name": q.Name}
	}

	c.JSON(http.StatusOK, gin.H{
		"id": setor.ID, "name": setor.Name, "tenantId": setor.TenantID,
		"createdAt": setor.CreatedAt, "updatedAt": setor.UpdatedAt,
		"members": membersResp,
		"queues":  queuesResp,
	})
}

// Create inserts a Setor. TenantID always comes from context — never from payload
// (mass-assignment prevention).
// @Summary      Criar setor
// @Tags         setores
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /setores [post]
func (sc *SetorController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Setores")
	if !ok {
		return
	}
	var in setorInput
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
	setor := models.Setor{TenantID: tenantID, Name: name}
	if err := db.Create(&setor).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateSetor")
		return
	}
	c.JSON(http.StatusOK, setor)
}

// Update renames a Setor. Tenant-scoped.
// @Summary      Atualizar setor
// @Tags         setores
// @Accept       json
// @Produce      json
// @Param        setorId  path  int  true  "ID do setor"
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /setores/{setorId} [put]
func (sc *SetorController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Setores")
	if !ok {
		return
	}
	setorID, ok := utils.ParseIntParam(c, "setorId")
	if !ok {
		return
	}
	var setor models.Setor
	if err := db.Where(`id = ? AND "tenantId" = ?`, setorID, tenantID).First(&setor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "setor não encontrado"})
		return
	}
	var in setorInput
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
	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Setor{}).
		Where(`id = ? AND "tenantId" = ?`, setorID, tenantID).
		Update("name", name).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateSetor")
		return
	}
	setor.Name = name
	c.JSON(http.StatusOK, setor)
}

// Delete removes a Setor. Blocked (409) if it still has members — realocar
// primeiro, NUNCA cascata silenciosa (isso removeria a única filiação de
// setor de usuários sem aviso). Se não tiver membros, apaga também as
// linhas de setor_filas vinculadas antes de deletar o Setor.
// @Summary      Remover setor
// @Tags         setores
// @Produce      json
// @Param        setorId  path  int  true  "ID do setor"
// @Success      200  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Security     BearerAuth
// @Router       /setores/{setorId} [delete]
func (sc *SetorController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Setores")
	if !ok {
		return
	}
	setorID, ok := utils.ParseIntParam(c, "setorId")
	if !ok {
		return
	}

	var setor models.Setor
	if err := db.Where(`id = ? AND "tenantId" = ?`, setorID, tenantID).First(&setor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "setor não encontrado"})
		return
	}

	var memberCount int64
	db.Session(&gorm.Session{NewDB: true}).Model(&models.UserSetor{}).
		Where(`"setorId" = ?`, setorID).Count(&memberCount)
	if memberCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error": "não é possível excluir um Setor com membros vinculados — realoque os usuários primeiro",
		})
		return
	}

	// Session(NewDB:true) antes do Transaction: db já foi usado em Where().First()
	// acima (linha 267) e na agregação de membros — sem reset, a transação herda
	// clauses residuais do db.Statement e o DELETE gera SQL inválido/mal-escopado.
	err := db.Session(&gorm.Session{NewDB: true}).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where(`"setorId" = ?`, setorID).Delete(&models.SetorFila{}).Error; err != nil {
			return err
		}
		return tx.Where(`id = ? AND "tenantId" = ?`, setorID, tenantID).Delete(&models.Setor{}).Error
	})
	if err != nil {
		utils.RespondWithInternalError(c, err, "DeleteSetor")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Setor removido"})
}

// AddMember links a User (same tenant) to a Setor, optionally marking ehGestor.
// If the link already exists, UPSERT do campo ehGestor (não é erro de duplicata).
// Decisão de forma idiomática: clause.OnConflict com DoUpdates no par
// (userId, setorId) — equivalente em efeito a FirstOrCreate+Save, mas
// atômico em 1 statement (evita race condition entre check e insert).
// @Summary      Adicionar membro ao setor
// @Tags         setores
// @Accept       json
// @Produce      json
// @Param        setorId  path  int  true  "ID do setor"
// @Success      200  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /setores/{setorId}/members [post]
func (sc *SetorController) AddMember(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Setores")
	if !ok {
		return
	}
	setorID, ok := utils.ParseIntParam(c, "setorId")
	if !ok {
		return
	}
	var setor models.Setor
	if err := db.Where(`id = ? AND "tenantId" = ?`, setorID, tenantID).First(&setor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "setor não encontrado"})
		return
	}

	var in addMemberInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if in.UserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId é obrigatório"})
		return
	}

	// userId precisa pertencer ao mesmo tenant. Session(NewDB:true) OBRIGATÓRIO:
	// o db de auth.GetScoped já foi usado na query do Setor acima — reusar sem
	// reset acumula condições e casa 0 linhas (ver docs/agents/proxy.md e
	// reference_gorm_getscoped_newdb). tenantID já veio do primeiro GetScoped.
	var user models.User
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where(`id = ? AND "tenantId" = ?`, in.UserID, tenantID).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "usuário não pertence a este tenant"})
		return
	}

	link := models.UserSetor{UserID: in.UserID, SetorID: setorID, EhGestor: in.EhGestor}
	if err := db.Session(&gorm.Session{NewDB: true}).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "userId"}, {Name: "setorId"}},
			DoUpdates: clause.AssignmentColumns([]string{"ehGestor"}),
		}).Create(&link).Error; err != nil {
		utils.RespondWithInternalError(c, err, "AddSetorMember")
		return
	}
	c.JSON(http.StatusOK, gin.H{"userId": link.UserID, "setorId": link.SetorID, "ehGestor": link.EhGestor})
}

// UpdateMember updates only the ehGestor flag of an existing link. 404 if the
// link does not exist.
// @Summary      Atualizar vínculo de membro do setor
// @Tags         setores
// @Accept       json
// @Produce      json
// @Param        setorId  path  int  true  "ID do setor"
// @Param        userId   path  int  true  "ID do usuário"
// @Success      200  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /setores/{setorId}/members/{userId} [put]
func (sc *SetorController) UpdateMember(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Setores")
	if !ok {
		return
	}
	setorID, ok := utils.ParseIntParam(c, "setorId")
	if !ok {
		return
	}
	userID, ok := utils.ParseIntParam(c, "userId")
	if !ok {
		return
	}
	var setor models.Setor
	if err := db.Where(`id = ? AND "tenantId" = ?`, setorID, tenantID).First(&setor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "setor não encontrado"})
		return
	}

	var in updateMemberInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	var link models.UserSetor
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where(`"setorId" = ? AND "userId" = ?`, setorID, userID).First(&link).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vínculo não encontrado"})
		return
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.UserSetor{}).
		Where(`"setorId" = ? AND "userId" = ?`, setorID, userID).
		Update("ehGestor", in.EhGestor).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateSetorMember")
		return
	}
	c.JSON(http.StatusOK, gin.H{"userId": userID, "setorId": setorID, "ehGestor": in.EhGestor})
}

// RemoveMember unlinks a User from a Setor.
//
// DIVISÃO DE RESPONSABILIDADE (importante): a proteção anti-lockout do
// ADR 0022 protege o ÚLTIMO ADMINISTRADOR DO TENANT (Cargo="Administrador" +
// Alcance="tenant") contra ser removido/rebaixado — isso é escopo do
// controller de User/Cargo (GAP-5), acionado quando alguém tenta trocar o
// Cargo de um User ou deletar um User Administrador. Remover um vínculo de
// Setor (este handler) NÃO troca Cargo nem deleta o User — não aciona (e não
// deve acionar) a checagem de anti-lockout. Por isso este handler remove o
// vínculo incondicionalmente, sem checagem extra.
// @Summary      Remover membro do setor
// @Tags         setores
// @Produce      json
// @Param        setorId  path  int  true  "ID do setor"
// @Param        userId   path  int  true  "ID do usuário"
// @Success      200  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /setores/{setorId}/members/{userId} [delete]
func (sc *SetorController) RemoveMember(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Setores")
	if !ok {
		return
	}
	setorID, ok := utils.ParseIntParam(c, "setorId")
	if !ok {
		return
	}
	userID, ok := utils.ParseIntParam(c, "userId")
	if !ok {
		return
	}
	var setor models.Setor
	if err := db.Where(`id = ? AND "tenantId" = ?`, setorID, tenantID).First(&setor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "setor não encontrado"})
		return
	}

	res := db.Session(&gorm.Session{NewDB: true}).
		Where(`"setorId" = ? AND "userId" = ?`, setorID, userID).Delete(&models.UserSetor{})
	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "RemoveSetorMember")
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "vínculo não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Membro removido do setor"})
}

// SetQueues replaces (not merges) the Queues linked to a Setor: valida que
// todos os queueIds pertencem ao mesmo tenant (400 sem aplicar nada, se algum
// não pertencer), depois apaga as linhas antigas de setor_filas e insere as
// novas, dentro de uma transação.
// @Summary      Definir filas do setor
// @Tags         setores
// @Accept       json
// @Produce      json
// @Param        setorId  path  int  true  "ID do setor"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Security     BearerAuth
// @Router       /setores/{setorId}/queues [put]
func (sc *SetorController) SetQueues(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Setores")
	if !ok {
		return
	}
	setorID, ok := utils.ParseIntParam(c, "setorId")
	if !ok {
		return
	}
	var setor models.Setor
	if err := db.Where(`id = ? AND "tenantId" = ?`, setorID, tenantID).First(&setor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "setor não encontrado"})
		return
	}

	var in setQueuesInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if len(in.QueueIDs) > 0 {
		var count int64
		db.Session(&gorm.Session{NewDB: true}).Model(&models.Queue{}).
			Where(`id IN (?) AND "tenantId" = ?`, in.QueueIDs, tenantID).
			Count(&count)
		if int(count) != len(uniqueInts(in.QueueIDs)) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "uma ou mais filas não pertencem a este tenant"})
			return
		}
	}

	// Session(NewDB:true) antes do Transaction — mesmo motivo do Delete: db já
	// foi usado em Where().First() acima, reusar sem reset acumula clauses e
	// quebra o SQL do DELETE/INSERT dentro da transação.
	err := db.Session(&gorm.Session{NewDB: true}).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where(`"setorId" = ?`, setorID).Delete(&models.SetorFila{}).Error; err != nil {
			return err
		}
		for _, qID := range uniqueInts(in.QueueIDs) {
			if err := tx.Create(&models.SetorFila{SetorID: setorID, QueueID: qID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		utils.RespondWithInternalError(c, err, "SetSetorQueues")
		return
	}
	c.JSON(http.StatusOK, gin.H{"setorId": setorID, "queueIds": uniqueInts(in.QueueIDs)})
}

// uniqueInts is defined in cargo.go (identical dedup helper needed by both
// controllers) — reused here to avoid a duplicate declaration in the package.

// ============================================================================
// ROTAS A REGISTRAR (NÃO editado neste PR — registrar depois em
// business/internal/routes/routes.go e instanciar o controller em
// business/internal/application/container.go, seguindo o mesmo padrão de
// QueueController/ProxyGroupController):
//
// container.go (ou routes.go, já que este controller não tem dependências,
// seguindo o padrão de `queueController := controllers.NewQueueController()`
// direto em routes.go — não precisa entrar em container.go):
//
//   setorController := controllers.NewSetorController()
//
// routes.go (dentro do grupo `protected`):
//
//   protected.GET("/setores", setorController.List)
//   protected.GET("/setores/:setorId", setorController.Show)
//   protected.POST("/setores", setorController.Create)
//   protected.PUT("/setores/:setorId", setorController.Update)
//   protected.DELETE("/setores/:setorId", setorController.Delete)
//   protected.POST("/setores/:setorId/members", setorController.AddMember)
//   protected.PUT("/setores/:setorId/members/:userId", setorController.UpdateMember)
//   protected.DELETE("/setores/:setorId/members/:userId", setorController.RemoveMember)
//   protected.PUT("/setores/:setorId/queues", setorController.SetQueues)
// ============================================================================
