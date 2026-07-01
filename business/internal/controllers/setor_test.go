package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSetorTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func setupSetorContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	var req *http.Request
	if body != nil {
		req, _ = http.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, path, nil)
	}
	c.Request = req

	c.Set("tenantId", tenantID)
	c.Set("alcance", "tenant")
	c.Set("userId", float64(1))
	scoped := db.Where(`"tenantId" = ?`, tenantID)
	c.Set("db", scoped)

	return c, w
}

func createTestUser(t *testing.T, db *gorm.DB, tenantID uuid.UUID, name, email string) int {
	t.Helper()
	var u models.User
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", alcance) VALUES (?,?,?,?,?)`,
		name, email, "x", tenantID, "proprio")
	require.NoError(t, db.Raw(`SELECT * FROM "Users" WHERE email = ?`, email).Scan(&u).Error)
	return u.ID
}

func createTestQueue(t *testing.T, db *gorm.DB, tenantID uuid.UUID, name, color string) int {
	t.Helper()
	var q models.Queue
	db.Exec(`INSERT INTO "Queues" (name, color, "tenantId") VALUES (?,?,?)`, name, color, tenantID)
	require.NoError(t, db.Raw(`SELECT * FROM "Queues" WHERE name = ?`, name).Scan(&q).Error)
	return q.ID
}

func createTestSetor(t *testing.T, db *gorm.DB, tenantID uuid.UUID, name string) int {
	t.Helper()
	var s models.Setor
	db.Exec(`INSERT INTO "Setores" (name, "tenantId") VALUES (?,?)`, name, tenantID)
	require.NoError(t, db.Raw(`SELECT * FROM "Setores" WHERE name = ? AND "tenantId" = ?`, name, tenantID).Scan(&s).Error)
	return s.ID
}

// --- List ---

func TestSetorController_List_TenantIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	createTestSetor(t, db, tenantA, "Comercial")
	createTestSetor(t, db, tenantB, "Suporte")

	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantA, "GET", "/setores", nil)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var setores []map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &setores))
	assert.Len(t, setores, 1)
	assert.Equal(t, "Comercial", setores[0]["name"])
}

func TestSetorController_List_MemberAndGestorCounts(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "Vendas")
	u1 := createTestUser(t, db, tenantID, "Alice", "alice@test.com")
	u2 := createTestUser(t, db, tenantID, "Bob", "bob@test.com")
	db.Exec(`INSERT INTO user_setores ("userId", "setorId", "ehGestor") VALUES (?,?,?)`, u1, setorID, true)
	db.Exec(`INSERT INTO user_setores ("userId", "setorId", "ehGestor") VALUES (?,?,?)`, u2, setorID, false)

	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "GET", "/setores", nil)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var setores []map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &setores))
	require.Len(t, setores, 1)
	assert.EqualValues(t, 2, setores[0]["memberCount"])
	assert.EqualValues(t, 1, setores[0]["gestorCount"])
}

// --- Show ---

func TestSetorController_Show_MembersAndQueues(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "Financeiro")
	uID := createTestUser(t, db, tenantID, "Carla", "carla@test.com")
	qID := createTestQueue(t, db, tenantID, "Cobranca", "#FF0000")
	db.Exec(`INSERT INTO user_setores ("userId", "setorId", "ehGestor") VALUES (?,?,?)`, uID, setorID, true)
	db.Exec(`INSERT INTO setor_filas ("setorId", "queueId") VALUES (?,?)`, setorID, qID)

	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "GET", fmt.Sprintf("/setores/%d", setorID), nil)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}}

	ctrl.Show(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Financeiro", resp["name"])

	members, ok := resp["members"].([]interface{})
	require.True(t, ok)
	require.Len(t, members, 1)
	member := members[0].(map[string]interface{})
	assert.Equal(t, "Carla", member["name"])
	assert.Equal(t, "carla@test.com", member["email"])
	assert.Equal(t, true, member["ehGestor"])

	queues, ok := resp["queues"].([]interface{})
	require.True(t, ok)
	require.Len(t, queues, 1)
	queue := queues[0].(map[string]interface{})
	assert.Equal(t, "Cobranca", queue["name"])
}

func TestSetorController_Show_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "GET", "/setores/9999", nil)
	c.Params = gin.Params{{Key: "setorId", Value: "9999"}}

	ctrl.Show(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// --- Create ---

func TestSetorController_Create_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{"name": "Novo Setor"})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "POST", "/setores", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Novo Setor", resp["name"])
}

func TestSetorController_Create_RejectsMassAssignmentOfTenantID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()
	otherTenant := uuid.New()

	// Payload tenta injetar um tenantId diferente — o controller não tem
	// campo tenantId em setorInput, então o bind ignora e o TenantID sempre
	// vem do contexto (auth.GetScoped), nunca do payload.
	payload, _ := json.Marshal(map[string]interface{}{
		"name":     "Setor Malicioso",
		"tenantId": otherTenant.String(),
	})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "POST", "/setores", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, tenantID.String(), resp["tenantId"])
}

func TestSetorController_Create_EmptyNameRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{"name": "   "})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "POST", "/setores", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// --- Update ---

func TestSetorController_Update_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "Antigo")

	payload, _ := json.Marshal(map[string]string{"name": "Renomeado"})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "PUT", fmt.Sprintf("/setores/%d", setorID), payload)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}}

	ctrl.Update(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Renomeado", resp["name"])
}

// --- Delete ---

func TestSetorController_Delete_BlockedWithMembers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "ComMembros")
	uID := createTestUser(t, db, tenantID, "Dave", "dave@test.com")
	db.Exec(`INSERT INTO user_setores ("userId", "setorId", "ehGestor") VALUES (?,?,?)`, uID, setorID, false)

	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "DELETE", fmt.Sprintf("/setores/%d", setorID), nil)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}}

	ctrl.Delete(c)

	assert.Equal(t, http.StatusConflict, w.Code)

	var count int64
	db.Model(&models.Setor{}).Where("id = ?", setorID).Count(&count)
	assert.EqualValues(t, 1, count, "setor não deve ter sido deletado")
}

func TestSetorController_Delete_AllowedWithoutMembers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "SemMembros")
	qID := createTestQueue(t, db, tenantID, "FilaVazia", "#ABCDEF")
	db.Exec(`INSERT INTO setor_filas ("setorId", "queueId") VALUES (?,?)`, setorID, qID)

	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "DELETE", fmt.Sprintf("/setores/%d", setorID), nil)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}}

	ctrl.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var setorCount int64
	db.Model(&models.Setor{}).Where("id = ?", setorID).Count(&setorCount)
	assert.EqualValues(t, 0, setorCount)

	var filaCount int64
	db.Model(&models.SetorFila{}).Where(`"setorId" = ?`, setorID).Count(&filaCount)
	assert.EqualValues(t, 0, filaCount, "setor_filas vinculadas devem ser removidas junto")
}

// --- AddMember ---

func TestSetorController_AddMember_CreatesLink(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "Novo")
	uID := createTestUser(t, db, tenantID, "Eve", "eve@test.com")

	payload, _ := json.Marshal(map[string]interface{}{"userId": uID, "ehGestor": false})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "POST", fmt.Sprintf("/setores/%d/members", setorID), payload)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}}

	ctrl.AddMember(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var link models.UserSetor
	require.NoError(t, db.Where(`"setorId" = ? AND "userId" = ?`, setorID, uID).First(&link).Error)
	assert.False(t, link.EhGestor)
}

func TestSetorController_AddMember_UpsertsEhGestorOnExistingLink(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "Existente")
	uID := createTestUser(t, db, tenantID, "Frank", "frank@test.com")
	db.Exec(`INSERT INTO user_setores ("userId", "setorId", "ehGestor") VALUES (?,?,?)`, uID, setorID, false)

	payload, _ := json.Marshal(map[string]interface{}{"userId": uID, "ehGestor": true})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "POST", fmt.Sprintf("/setores/%d/members", setorID), payload)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}}

	ctrl.AddMember(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var count int64
	db.Model(&models.UserSetor{}).Where(`"setorId" = ? AND "userId" = ?`, setorID, uID).Count(&count)
	assert.EqualValues(t, 1, count, "upsert não deve duplicar a linha")

	var link models.UserSetor
	require.NoError(t, db.Where(`"setorId" = ? AND "userId" = ?`, setorID, uID).First(&link).Error)
	assert.True(t, link.EhGestor, "ehGestor deve ter sido atualizado para true")
}

func TestSetorController_AddMember_RejectsCrossTenantUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	setorID := createTestSetor(t, db, tenantA, "SetorA")
	uID := createTestUser(t, db, tenantB, "Foreign", "foreign@test.com")

	payload, _ := json.Marshal(map[string]interface{}{"userId": uID, "ehGestor": false})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantA, "POST", fmt.Sprintf("/setores/%d/members", setorID), payload)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}}

	ctrl.AddMember(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// --- UpdateMember ---

func TestSetorController_UpdateMember_UpdatesFlag(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "Setor1")
	uID := createTestUser(t, db, tenantID, "Grace", "grace@test.com")
	db.Exec(`INSERT INTO user_setores ("userId", "setorId", "ehGestor") VALUES (?,?,?)`, uID, setorID, false)

	payload, _ := json.Marshal(map[string]bool{"ehGestor": true})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "PUT", fmt.Sprintf("/setores/%d/members/%d", setorID, uID), payload)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}, {Key: "userId", Value: fmt.Sprintf("%d", uID)}}

	ctrl.UpdateMember(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var link models.UserSetor
	require.NoError(t, db.Where(`"setorId" = ? AND "userId" = ?`, setorID, uID).First(&link).Error)
	assert.True(t, link.EhGestor)
}

func TestSetorController_UpdateMember_NotFoundLink(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "Setor2")
	uID := createTestUser(t, db, tenantID, "Hank", "hank@test.com")
	// Não cria o vínculo.

	payload, _ := json.Marshal(map[string]bool{"ehGestor": true})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "PUT", fmt.Sprintf("/setores/%d/members/%d", setorID, uID), payload)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}, {Key: "userId", Value: fmt.Sprintf("%d", uID)}}

	ctrl.UpdateMember(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// --- RemoveMember ---

func TestSetorController_RemoveMember_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "Setor3")
	uID := createTestUser(t, db, tenantID, "Ivan", "ivan@test.com")
	db.Exec(`INSERT INTO user_setores ("userId", "setorId", "ehGestor") VALUES (?,?,?)`, uID, setorID, true)

	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "DELETE", fmt.Sprintf("/setores/%d/members/%d", setorID, uID), nil)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}, {Key: "userId", Value: fmt.Sprintf("%d", uID)}}

	ctrl.RemoveMember(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var count int64
	db.Model(&models.UserSetor{}).Where(`"setorId" = ? AND "userId" = ?`, setorID, uID).Count(&count)
	assert.EqualValues(t, 0, count)
}

func TestSetorController_RemoveMember_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "Setor4")

	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "DELETE", fmt.Sprintf("/setores/%d/members/9999", setorID), nil)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}, {Key: "userId", Value: "9999"}}

	ctrl.RemoveMember(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// --- SetQueues ---

func TestSetorController_SetQueues_ReplacesLinks(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantID := uuid.New()

	setorID := createTestSetor(t, db, tenantID, "SetorFilas")
	qOld := createTestQueue(t, db, tenantID, "FilaAntiga", "#111111")
	qNew1 := createTestQueue(t, db, tenantID, "FilaNova1", "#222222")
	qNew2 := createTestQueue(t, db, tenantID, "FilaNova2", "#333333")
	db.Exec(`INSERT INTO setor_filas ("setorId", "queueId") VALUES (?,?)`, setorID, qOld)

	payload, _ := json.Marshal(map[string][]int{"queueIds": {qNew1, qNew2}})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantID, "PUT", fmt.Sprintf("/setores/%d/queues", setorID), payload)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}}

	ctrl.SetQueues(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var links []models.SetorFila
	db.Where(`"setorId" = ?`, setorID).Find(&links)
	require.Len(t, links, 2)
	linkedQueues := []int{links[0].QueueID, links[1].QueueID}
	assert.ElementsMatch(t, []int{qNew1, qNew2}, linkedQueues)

	var oldStillLinked int64
	db.Model(&models.SetorFila{}).Where(`"setorId" = ? AND "queueId" = ?`, setorID, qOld).Count(&oldStillLinked)
	assert.EqualValues(t, 0, oldStillLinked, "fila antiga deve ter sido removida (replace, não merge)")
}

func TestSetorController_SetQueues_RejectsCrossTenantQueue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupSetorTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	setorID := createTestSetor(t, db, tenantA, "SetorA2")
	qForeign := createTestQueue(t, db, tenantB, "FilaEstranha", "#999999")

	payload, _ := json.Marshal(map[string][]int{"queueIds": {qForeign}})
	ctrl := NewSetorController()
	c, w := setupSetorContext(t, db, tenantA, "PUT", fmt.Sprintf("/setores/%d/queues", setorID), payload)
	c.Params = gin.Params{{Key: "setorId", Value: fmt.Sprintf("%d", setorID)}}

	ctrl.SetQueues(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var count int64
	db.Model(&models.SetorFila{}).Where(`"setorId" = ?`, setorID).Count(&count)
	assert.EqualValues(t, 0, count, "nada deve ter sido aplicado quando a validação falha")
}
