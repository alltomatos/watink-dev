package controllers

import (
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/cryptobox"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// TestClientController_List_ReturnsOnlyOwnTenant garante que List nunca
// vaza Client de outro tenant — mesmo padrão de
// TestPipelineController_List_ReturnsOnlyOwnTenant (pipeline_test.go).
func TestClientController_List_ReturnsOnlyOwnTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantA)
	db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente B", "pf", tenantB)

	ctrl := NewClientController()
	c, w := setupPipelineContext(t, db, tenantA, "GET", "/clients", nil)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	clients, ok := resp["clients"].([]interface{})
	require.True(t, ok, "clients must be an array")
	assert.Len(t, clients, 1)
	client := clients[0].(map[string]interface{})
	assert.Equal(t, "Cliente A", client["name"])
}

// TestClientController_Create_Success cobre o happy-path PF: 201, o campo
// "document" volta em texto plano (o que foi enviado) e "documentEnc" nunca
// aparece no JSON (json:"-" em models.Client).
func TestClientController_Create_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv(cryptobox.EnvKey, "chave-de-teste-32-bytes-ou-mais-aaa")
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{
		"type":     "pf",
		"name":     "João da Silva",
		"document": "123.456.789-00",
		"email":    "joao@example.com",
		"phone":    "11999998888",
	})
	ctrl := NewClientController()
	c, w := setupPipelineContext(t, db, tenantID, "POST", "/clients", payload)

	ctrl.Create(c)

	require.Equal(t, http.StatusCreated, w.Code, "body: %s", w.Body.String())

	var raw map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &raw))
	assert.Equal(t, "123.456.789-00", raw["document"])
	_, hasDocumentEnc := raw["documentEnc"]
	assert.False(t, hasDocumentEnc, "documentEnc must never be serialized (json:\"-\")")

	var resp models.Client
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "João da Silva", resp.Name)
	assert.Equal(t, "pf", resp.Type)
}

// TestClientController_Create_RejectsSocialNameForPJ cobre a regra ADR 0023:
// Nome Social é exclusivo de Pessoa Física.
func TestClientController_Create_RejectsSocialNameForPJ(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv(cryptobox.EnvKey, "chave-de-teste-32-bytes-ou-mais-aaa")
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{
		"type":       "pj",
		"name":       "Empresa X",
		"socialName": "Nome Social Indevido",
	})
	ctrl := NewClientController()
	c, w := setupPipelineContext(t, db, tenantID, "POST", "/clients", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "body: %s", w.Body.String())
}

// TestClientController_Create_FailsClosedWithoutCryptoKey prova o fail-closed
// genuíno: sem PROXY_ENC_KEY configurada, Create com document não-vazio
// retorna 500 E não persiste nenhum registro (nunca "salva mesmo assim").
//
// cryptobox.loadKey() cacheia a chave via sync.Once para todo o processo —
// uma vez configurada em qualquer teste deste binário, IsConfigured() nunca
// mais volta a false. Por isso este teste roda em um SUBPROCESSO isolado
// (go test -run ^TestClientController_Create_FailsClosedWithoutCryptoKey$),
// livre de qualquer cache deixado por outros testes do pacote — sem depender
// de ordem de execução.
func TestClientController_Create_FailsClosedWithoutCryptoKey(t *testing.T) {
	if os.Getenv("CLIENT_TEST_SUBPROCESS") == "1" {
		runCreateFailsClosedWithoutCryptoKey(t)
		return
	}

	cmd := exec.Command(os.Args[0], "-test.run", "^TestClientController_Create_FailsClosedWithoutCryptoKey$", "-test.v")
	cmd.Env = append(os.Environ(), "CLIENT_TEST_SUBPROCESS=1", cryptobox.EnvKey+"=")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("subprocess failed: %v\noutput:\n%s", err, out)
	}
	t.Logf("subprocess output:\n%s", out)
}

// runCreateFailsClosedWithoutCryptoKey is the body executed inside the
// isolated subprocess — PROXY_ENC_KEY is guaranteed unset here.
func runCreateFailsClosedWithoutCryptoKey(t *testing.T) {
	require.False(t, cryptobox.IsConfigured(), "precondition: cryptobox must be unconfigured in the subprocess")

	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{
		"type":     "pf",
		"name":     "Sem Chave",
		"document": "999.999.999-99",
	})
	ctrl := NewClientController()
	c, w := setupPipelineContext(t, db, tenantID, "POST", "/clients", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code, "body: %s", w.Body.String())

	var count int64
	require.NoError(t, db.Session(&gorm.Session{NewDB: true}).
		Table("Clients").
		Where(`"tenantId" = ?`, tenantID).
		Count(&count).Error)
	assert.Equal(t, int64(0), count, "fail-closed must not persist any record")
}

// TestClientController_List_NeverReturnsPlaintextDocumentEnc garante que,
// mesmo com um Client tendo documento cifrado no banco, o JSON de List nunca
// expõe a chave "documentEnc" — só "document" já decifrado.
func TestClientController_List_NeverReturnsPlaintextDocumentEnc(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv(cryptobox.EnvKey, "chave-de-teste-32-bytes-ou-mais-aaa")
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{
		"type":     "pf",
		"name":     "Com Documento",
		"document": "111.222.333-44",
	})
	ctrl := NewClientController()
	cCreate, wCreate := setupPipelineContext(t, db, tenantID, "POST", "/clients", payload)
	ctrl.Create(cCreate)
	require.Equal(t, http.StatusCreated, wCreate.Code, "body: %s", wCreate.Body.String())

	cList, wList := setupPipelineContext(t, db, tenantID, "GET", "/clients", nil)
	ctrl.List(cList)
	require.Equal(t, http.StatusOK, wList.Code)

	var raw map[string]interface{}
	require.NoError(t, json.Unmarshal(wList.Body.Bytes(), &raw))
	clients, ok := raw["clients"].([]interface{})
	require.True(t, ok, "clients must be an array")
	require.Len(t, clients, 1)

	client := clients[0].(map[string]interface{})
	_, hasDocumentEnc := client["documentEnc"]
	assert.False(t, hasDocumentEnc, "documentEnc must never be serialized")
	assert.Equal(t, "111.222.333-44", client["document"])
}

// TestClientController_Update_PartialDocument_KeepsExistingWhenEmpty garante
// que enviar Update sem "document" preserva o documentEnc existente no banco
// (a regra do controller: só reescreve quando o payload traz valor
// não-vazio).
func TestClientController_Update_PartialDocument_KeepsExistingWhenEmpty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv(cryptobox.EnvKey, "chave-de-teste-32-bytes-ou-mais-aaa")
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	createPayload, _ := json.Marshal(map[string]interface{}{
		"type":     "pf",
		"name":     "Original",
		"document": "555.666.777-88",
	})
	ctrl := NewClientController()
	cCreate, wCreate := setupPipelineContext(t, db, tenantID, "POST", "/clients", createPayload)
	ctrl.Create(cCreate)
	require.Equal(t, http.StatusCreated, wCreate.Code, "body: %s", wCreate.Body.String())

	var created models.Client
	require.NoError(t, json.Unmarshal(wCreate.Body.Bytes(), &created))

	var beforeEnc string
	require.NoError(t, db.Session(&gorm.Session{NewDB: true}).
		Table("Clients").Select("\"documentEnc\"").
		Where(`id = ?`, created.ID).Row().Scan(&beforeEnc))
	require.NotEmpty(t, beforeEnc)

	updatePayload, _ := json.Marshal(map[string]interface{}{
		"type": "pf",
		"name": "Atualizado Sem Documento",
	})
	cUpdate, wUpdate := setupPipelineContextWithParam(t, db, tenantID, "PUT", "/clients/"+strconv.Itoa(created.ID), updatePayload, "id", strconv.Itoa(created.ID))
	ctrl.Update(cUpdate)
	require.Equal(t, http.StatusOK, wUpdate.Code, "body: %s", wUpdate.Body.String())

	var afterEnc string
	require.NoError(t, db.Session(&gorm.Session{NewDB: true}).
		Table("Clients").Select("\"documentEnc\"").
		Where(`id = ?`, created.ID).Row().Scan(&afterEnc))
	assert.Equal(t, beforeEnc, afterEnc, "documentEnc must not change when document is omitted")

	var resp models.Client
	require.NoError(t, json.Unmarshal(wUpdate.Body.Bytes(), &resp))
	assert.Equal(t, "Atualizado Sem Documento", resp.Name)
	assert.Equal(t, "555.666.777-88", resp.Document, "response must still decrypt to the original document")
}

// TestClientController_Update_NotFound cobre id inexistente → 404.
func TestClientController_Update_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{"type": "pf", "name": "Fantasma"})
	ctrl := NewClientController()
	c, w := setupPipelineContextWithParam(t, db, tenantID, "PUT", "/clients/9999", payload, "id", "9999")

	ctrl.Update(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// TestClientController_Delete_IsSoftDelete garante que Delete seta deletedAt
// (GORM soft-delete via gorm.DeletedAt embutido) em vez de remover a linha —
// e que List/Show deixam de enxergar o registro depois.
func TestClientController_Delete_IsSoftDelete(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv(cryptobox.EnvKey, "chave-de-teste-32-bytes-ou-mais-aaa")
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	createPayload, _ := json.Marshal(map[string]interface{}{"type": "pf", "name": "Para Remover"})
	ctrl := NewClientController()
	cCreate, wCreate := setupPipelineContext(t, db, tenantID, "POST", "/clients", createPayload)
	ctrl.Create(cCreate)
	require.Equal(t, http.StatusCreated, wCreate.Code, "body: %s", wCreate.Body.String())

	var created models.Client
	require.NoError(t, json.Unmarshal(wCreate.Body.Bytes(), &created))

	cDelete, wDelete := setupPipelineContextWithParam(t, db, tenantID, "DELETE", "/clients/"+strconv.Itoa(created.ID), nil, "id", strconv.Itoa(created.ID))
	ctrl.Delete(cDelete)
	assert.Equal(t, http.StatusOK, wDelete.Code, "body: %s", wDelete.Body.String())

	// Direct query bypassing GORM's soft-delete scope (Unscoped): the row must
	// still exist with DeletedAt populated — never hard-deleted.
	var unscoped models.Client
	require.NoError(t, db.Session(&gorm.Session{NewDB: true}).Unscoped().
		Where(`id = ?`, created.ID).First(&unscoped).Error, "row must still exist after soft-delete")
	assert.True(t, unscoped.DeletedAt.Valid, "deletedAt must be populated")

	// GORM's default soft-delete scope (List) must no longer return it.
	cList, wList := setupPipelineContext(t, db, tenantID, "GET", "/clients", nil)
	ctrl.List(cList)
	require.Equal(t, http.StatusOK, wList.Code)
	var listResp map[string]interface{}
	require.NoError(t, json.Unmarshal(wList.Body.Bytes(), &listResp))
	clients, ok := listResp["clients"].([]interface{})
	require.True(t, ok)
	assert.Len(t, clients, 0, "soft-deleted client must not appear in List")

	// Show must also 404 it now.
	cShow, wShow := setupPipelineContextWithParam(t, db, tenantID, "GET", "/clients/"+strconv.Itoa(created.ID), nil, "id", strconv.Itoa(created.ID))
	ctrl.Show(cShow)
	assert.Equal(t, http.StatusNotFound, wShow.Code, "soft-deleted client must not be found by Show")
}

// TestClientController_Delete_NotFound cobre id inexistente → 404.
func TestClientController_Delete_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	ctrl := NewClientController()
	c, w := setupPipelineContextWithParam(t, db, tenantID, "DELETE", "/clients/9999", nil, "id", "9999")

	ctrl.Delete(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
