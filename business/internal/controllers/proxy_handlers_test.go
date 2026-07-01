package controllers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// setupProxyCtx monta um gin.Context com o db ESCOPADO (já com .Where(tenantId)),
// reproduzindo exatamente o estado de auth.GetScoped que causa o bug de
// accumulated-conditions quando faltava Session(NewDB:true).
func setupProxyCtx(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path, paramVal string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(method, path, nil)
	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))
	c.Set("db", db.Where(`"tenantId" = ?`, tenantID))
	c.Params = gin.Params{{Key: "id", Value: paramVal}}
	return c, w
}

// P1-A: deletar um proxy NÃO pode rebaixar uma conexão de grupo para 'none'
// (fail-OPEN/vaza IP). Em modo group zera só proxyId; em single vira none.
func TestProxyDelete_GroupModeStaysFailClosed(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	grp := models.ProxyGroup{TenantID: tenantID, Name: "g", RotationStrategy: "rotate"}
	if err := db.Create(&grp).Error; err != nil {
		t.Fatalf("seed grp: %v", err)
	}
	px := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "h", Port: 1, Status: "active", ProxyGroupID: &grp.ID}
	if err := db.Create(&px).Error; err != nil {
		t.Fatalf("seed px: %v", err)
	}
	wGroup := models.Whatsapp{ID: 1, TenantID: tenantID, Name: "g1", ProxyMode: "group", ProxyGroupID: &grp.ID, ProxyID: &px.ID}
	wSingle := models.Whatsapp{ID: 2, TenantID: tenantID, Name: "s1", ProxyMode: "single", ProxyID: &px.ID}
	db.Create(&wGroup)
	db.Create(&wSingle)

	c, w := setupProxyCtx(t, db, tenantID, "DELETE", "/proxies/"+strconv.Itoa(px.ID), strconv.Itoa(px.ID))
	NewProxyController().Delete(c)
	if w.Code != http.StatusOK {
		t.Fatalf("status %d body %s", w.Code, w.Body.String())
	}

	var g, s models.Whatsapp
	db.First(&g, 1)
	db.First(&s, 2)
	// group: preserva modo+grupo, zera só proxyId → pickGroupProxy re-escolhe (fail-closed)
	if g.ProxyMode != "group" || g.ProxyGroupID == nil {
		t.Fatalf("conexão group perdeu o modo (FAIL-OPEN): mode=%q grp=%v", g.ProxyMode, g.ProxyGroupID)
	}
	if g.ProxyID != nil {
		t.Fatalf("conexão group deveria ter proxyId nil, got %v", *g.ProxyID)
	}
	// single: vira none
	if s.ProxyMode != "none" || s.ProxyID != nil {
		t.Fatalf("conexão single deveria virar none: mode=%q id=%v", s.ProxyMode, s.ProxyID)
	}
}

// P1-B: ProxyGroupController.Delete deve DELETAR o grupo e desvincular de fato
// (antes do fix NewDB a transação abortava e o grupo NÃO era deletado).
func TestProxyGroupDelete_PersistsAndDetaches(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	grp := models.ProxyGroup{TenantID: tenantID, Name: "g", RotationStrategy: "sticky"}
	db.Create(&grp)
	px := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "h", Port: 1, Status: "active", ProxyGroupID: &grp.ID}
	db.Create(&px)
	wConn := models.Whatsapp{ID: 1, TenantID: tenantID, Name: "g1", ProxyMode: "group", ProxyGroupID: &grp.ID, ProxyID: &px.ID}
	db.Create(&wConn)

	c, w := setupProxyCtx(t, db, tenantID, "DELETE", "/proxy-groups/"+strconv.Itoa(grp.ID), strconv.Itoa(grp.ID))
	NewProxyGroupController().Delete(c)
	if w.Code != http.StatusOK {
		t.Fatalf("status %d body %s", w.Code, w.Body.String())
	}

	var cnt int64
	db.Model(&models.ProxyGroup{}).Where("id = ?", grp.ID).Count(&cnt)
	if cnt != 0 {
		t.Fatalf("grupo NÃO foi deletado (bug NewDB)")
	}
	var p models.Proxy
	db.First(&p, px.ID)
	if p.ProxyGroupID != nil {
		t.Fatalf("proxy deveria estar desvinculado")
	}
	var cn models.Whatsapp
	db.First(&cn, 1)
	if cn.ProxyGroupID != nil || cn.ProxyMode != "none" {
		t.Fatalf("conexão deveria estar desvinculada: grp=%v mode=%q", cn.ProxyGroupID, cn.ProxyMode)
	}
}

// P1-C: ConnectionGroupController.Delete deve deletar e desvincular de fato.
func TestConnectionGroupDelete_PersistsAndDetaches(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	cg := models.ConnectionGroup{TenantID: tenantID, Name: "cg"}
	db.Create(&cg)
	wConn := models.Whatsapp{ID: 1, TenantID: tenantID, Name: "c1", ConnectionGroupID: &cg.ID}
	db.Create(&wConn)

	c, w := setupProxyCtx(t, db, tenantID, "DELETE", "/connection-groups/"+strconv.Itoa(cg.ID), strconv.Itoa(cg.ID))
	NewConnectionGroupController().Delete(c)
	if w.Code != http.StatusOK {
		t.Fatalf("status %d body %s", w.Code, w.Body.String())
	}

	var cnt int64
	db.Model(&models.ConnectionGroup{}).Where("id = ?", cg.ID).Count(&cnt)
	if cnt != 0 {
		t.Fatalf("connection group NÃO foi deletado (bug NewDB)")
	}
	var cn models.Whatsapp
	db.First(&cn, 1)
	if cn.ConnectionGroupID != nil {
		t.Fatalf("conexão deveria estar desvinculada")
	}
}

// A1: qualquer resposta HTTP recebida pelo proxy ⇒ proxy OK (geo é best-effort).
// Falha do serviço de geo (429/5xx/status:fail) NÃO rebaixa o proxy.
func TestInterpretProbeResponse_GeoBestEffort(t *testing.T) {
	mk := func(status int, body string) *http.Response {
		return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(body))}
	}

	// 429 do ip-api → proxy OK, geo vazia
	r := interpretProbeResponse(mk(429, ""), 10)
	if !r.OK {
		t.Fatal("429 deveria manter OK=true (proxy roteou)")
	}
	if r.City != "" || r.IP != "" {
		t.Fatalf("geo deveria estar vazia em 429: %+v", r)
	}

	// 200 + success → OK + geo
	r2 := interpretProbeResponse(mk(200, `{"status":"success","city":"Fortaleza","country":"Brazil","countryCode":"BR","query":"1.2.3.4"}`), 20)
	if !r2.OK || r2.City != "Fortaleza" || r2.IP != "1.2.3.4" || r2.CountryCode != "BR" {
		t.Fatalf("200 deveria trazer geo: %+v", r2)
	}

	// 200 + status:fail → OK, sem geo
	r3 := interpretProbeResponse(mk(200, `{"status":"fail"}`), 5)
	if !r3.OK || r3.City != "" {
		t.Fatalf("status:fail deveria manter OK sem geo: %+v", r3)
	}
}

// setupProxyCtxWithBody é setupProxyCtx + um corpo JSON, para handlers que
// fazem ShouldBindJSON (Update).
func setupProxyCtxWithBody(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path, paramVal string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	b, _ := json.Marshal(body)
	c.Request = httptest.NewRequest(method, path, bytes.NewBuffer(b))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))
	c.Set("db", db.Where(`"tenantId" = ?`, tenantID))
	c.Params = gin.Params{{Key: "id", Value: paramVal}}
	return c, w
}

// P3-UPDDUP: editar o endpoint de um proxy para bater com outro JÁ EXISTENTE
// do tenant deve ser rejeitado com 409, não silenciosamente furar o dedup
// lógico (scheme,host,port) que o Create já impõe.
func TestProxyUpdate_EndpointDuplicate_Conflict(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	a := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "a.example", Port: 1, Status: "active"}
	b := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "b.example", Port: 2, Status: "active"}
	db.Create(&a)
	db.Create(&b)

	// Edita B para ter o MESMO endpoint de A.
	c, w := setupProxyCtxWithBody(t, db, tenantID, "PUT", "/proxies/"+strconv.Itoa(b.ID), strconv.Itoa(b.ID),
		map[string]interface{}{"scheme": "http", "host": "a.example", "port": 1})
	NewProxyController().Update(c)

	if w.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409; body=%s", w.Code, w.Body.String())
	}
	var reloadedB models.Proxy
	db.First(&reloadedB, b.ID)
	if reloadedB.Host == "a.example" {
		t.Fatal("update deveria ter sido rejeitado — endpoint duplicado não pode persistir")
	}
}

// P3-UPDDUP: mudar o endpoint de um proxy TESTADO (healthy=true, geo
// preenchida) deve resetar healthy/geo — senão o operador vê "OK, Fortaleza"
// para um IP que, na verdade, nunca foi testado.
func TestProxyUpdate_EndpointChanged_ResetsHealthAndGeo(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	p := models.Proxy{
		TenantID: tenantID, Scheme: "http", Host: "old.example", Port: 1, Status: "active",
		Healthy: true, City: "Fortaleza", Country: "Brazil", CountryCode: "BR",
	}
	db.Create(&p)

	c, w := setupProxyCtxWithBody(t, db, tenantID, "PUT", "/proxies/"+strconv.Itoa(p.ID), strconv.Itoa(p.ID),
		map[string]interface{}{"scheme": "http", "host": "new.example", "port": 1})
	NewProxyController().Update(c)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	var reloaded models.Proxy
	db.First(&reloaded, p.ID)
	if reloaded.Healthy || reloaded.City != "" || reloaded.Country != "" || reloaded.CountryCode != "" {
		t.Fatalf("healthy/geo deveriam ter sido resetados após mudar o endpoint: %+v", reloaded)
	}
	if reloaded.Host != "new.example" {
		t.Fatalf("host não foi atualizado: %q", reloaded.Host)
	}
}

// Editar SEM mudar o endpoint (ex.: só o label) preserva healthy/geo — não
// pode resetar à toa a cada edição.
func TestProxyUpdate_EndpointUnchanged_PreservesHealthAndGeo(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	p := models.Proxy{
		TenantID: tenantID, Scheme: "http", Host: "same.example", Port: 1, Status: "active",
		Healthy: true, City: "Fortaleza",
	}
	db.Create(&p)

	c, w := setupProxyCtxWithBody(t, db, tenantID, "PUT", "/proxies/"+strconv.Itoa(p.ID), strconv.Itoa(p.ID),
		map[string]interface{}{"label": "novo rótulo"})
	NewProxyController().Update(c)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", w.Code, w.Body.String())
	}
	var reloaded models.Proxy
	db.First(&reloaded, p.ID)
	if !reloaded.Healthy || reloaded.City != "Fortaleza" {
		t.Fatalf("healthy/geo NÃO deveriam ter sido resetados (endpoint não mudou): %+v", reloaded)
	}
	if reloaded.Label != "novo rótulo" {
		t.Fatalf("label não foi atualizado: %q", reloaded.Label)
	}
}
