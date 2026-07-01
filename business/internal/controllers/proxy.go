package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/cryptobox"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// proxyKey identifies a proxy for dedup: same endpoint + scheme = "o mesmo proxy".
func proxyKey(scheme, host string, port int) string {
	return fmt.Sprintf("%s|%s|%d", scheme, host, port)
}

// proxyExistsForTenant reports whether a proxy with the same (scheme, host, port)
// already exists for the tenant.
func proxyExistsForTenant(db *gorm.DB, tenantID interface{}, scheme, host string, port int) bool {
	return proxyExistsForTenantExcluding(db, tenantID, scheme, host, port, 0)
}

// proxyExistsForTenantExcluding is proxyExistsForTenant but ignores a given id
// — used by Update so editing a proxy WITHOUT changing its endpoint never
// false-positives against itself.
func proxyExistsForTenantExcluding(db *gorm.DB, tenantID interface{}, scheme, host string, port, excludeID int) bool {
	var n int64
	db.Session(&gorm.Session{NewDB: true}).Model(&models.Proxy{}).
		Where(`"tenantId" = ? AND scheme = ? AND host = ? AND port = ? AND id <> ?`, tenantID, scheme, host, port, excludeID).
		Count(&n)
	return n > 0
}

// proxyGroupOwnedByTenant reports whether the proxy group id (if any) exists for
// the tenant. nil id (ungrouped) is always valid.
func proxyGroupOwnedByTenant(db *gorm.DB, tenantID interface{}, id *int) bool {
	if id == nil {
		return true
	}
	var g models.ProxyGroup
	return db.Session(&gorm.Session{NewDB: true}).
		Where(`id = ? AND "tenantId" = ?`, *id, tenantID).First(&g).Error == nil
}

// ProxyController manages the tenant's proxy pool. All queries are tenant-scoped
// via auth.GetScoped (reusing the "Whatsapps" permission — proxies are
// connection infrastructure). Passwords are encrypted-at-rest (cryptobox) and
// never serialized back to the client.
type ProxyController struct{}

func NewProxyController() *ProxyController { return &ProxyController{} }

// whatsmeow only supports socks5:// and http:// proxy schemes — https:// raises
// "unknown scheme https" (whatsmeow issue #700).
var allowedProxySchemes = map[string]bool{"http": true, "socks5": true}

func normalizeScheme(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.TrimSuffix(s, "://")
	if s == "" {
		return "http"
	}
	return s
}

// toProxyResponse builds the safe API representation — never includes the
// password ciphertext, only a boolean telling the UI a credential exists.
func toProxyResponse(p models.Proxy) gin.H {
	return gin.H{
		"id":            p.ID,
		"tenantId":      p.TenantID,
		"label":         p.Label,
		"scheme":        p.Scheme,
		"host":          p.Host,
		"port":          p.Port,
		"username":      p.Username,
		"status":        p.Status,
		"proxyGroupId":  p.ProxyGroupID,
		"healthy":       p.Healthy,
		"country":       p.Country,
		"countryCode":   p.CountryCode,
		"city":          p.City,
		"hasPassword":   p.HasPassword(),
		"lastCheckedAt": p.LastCheckedAt,
		"lastUsedAt":    p.LastUsedAt,
		"notes":         p.Notes,
		"createdAt":     p.CreatedAt,
		"updatedAt":     p.UpdatedAt,
	}
}

// List returns the tenant's proxies, optionally filtered by ?status=.
// @Summary      Listar proxies
// @Tags         proxies
// @Produce      json
// @Success      200  {array}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxies [get]
func (pc *ProxyController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	var proxies []models.Proxy
	q := db.Where(`"tenantId" = ?`, tenantID)
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	switch gid := c.Query("groupId"); {
	case gid == "ungrouped":
		q = q.Where(`"proxyGroupId" IS NULL`)
	case gid != "":
		q = q.Where(`"proxyGroupId" = ?`, gid)
	}
	if err := q.Order("id DESC").Find(&proxies).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListProxies")
		return
	}
	resp := make([]gin.H, len(proxies))
	for i := range proxies {
		resp[i] = toProxyResponse(proxies[i])
	}
	c.JSON(http.StatusOK, resp)
}

type proxyInput struct {
	Label        string `json:"label"`
	Scheme       string `json:"scheme"`
	Host         string `json:"host"`
	Port         int    `json:"port"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	Notes        string `json:"notes"`
	ProxyGroupID *int   `json:"proxyGroupId"`
}

func validateProxyStrings(c *gin.Context, in proxyInput) bool {
	for _, f := range []struct {
		v     string
		name  string
		limit int
	}{
		{in.Label, "label", 120},
		{in.Host, "host", 255},
		{in.Username, "username", 255},
		{in.Notes, "notes", 1000},
		{in.Password, "password", 512},
	} {
		if _, err := utils.ValidateStringField(f.v, f.name, f.limit); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return false
		}
	}
	return true
}

// Create inserts a single proxy.
// @Summary      Criar proxy
// @Tags         proxies
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxies [post]
func (pc *ProxyController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	var in proxyInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if !validateProxyStrings(c, in) {
		return
	}
	scheme := normalizeScheme(in.Scheme)
	if !allowedProxySchemes[scheme] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scheme inválido: use 'http' ou 'socks5' (https não é suportado pelo whatsmeow)"})
		return
	}
	if strings.TrimSpace(in.Host) == "" || in.Port < 1 || in.Port > 65535 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "host/port inválidos"})
		return
	}

	enc := ""
	if in.Password != "" {
		if !cryptobox.IsConfigured() {
			c.JSON(http.StatusInternalServerError, gin.H{"error": cryptobox.ErrNotConfigured.Error()})
			return
		}
		e, err := cryptobox.Encrypt(in.Password)
		if err != nil {
			utils.RespondWithInternalError(c, err, "EncryptProxyPassword")
			return
		}
		enc = e
	}

	if !proxyGroupOwnedByTenant(db, tenantID, in.ProxyGroupID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "grupo de proxy não encontrado para este tenant"})
		return
	}
	if proxyExistsForTenant(db, tenantID, scheme, in.Host, in.Port) {
		c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("proxy %s://%s:%d já está cadastrado", scheme, in.Host, in.Port)})
		return
	}

	p := models.Proxy{
		TenantID: tenantID, Label: in.Label, Scheme: scheme,
		Host: in.Host, Port: in.Port, Username: in.Username,
		PasswordEnc: enc, Status: "active", Notes: in.Notes,
		ProxyGroupID: in.ProxyGroupID,
	}
	if err := db.Create(&p).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateProxy")
		return
	}
	c.JSON(http.StatusOK, toProxyResponse(p))
}

type proxyImportInput struct {
	Raw          string `json:"raw"`
	Scheme       string `json:"scheme"`
	Label        string `json:"label"`
	ProxyGroupID *int   `json:"proxyGroupId"`
}

// parseProxyLine parses a Webshare-style "host:port:user:pass" line (or the
// auth-less "host:port" form). Returns a clear error for malformed lines.
// Assumes IPv4/hostname (Webshare format); a bracketless IPv6 literal has extra
// colons and is rejected by the len switch rather than mis-parsed.
func parseProxyLine(line string) (host string, port int, user, pass string, err error) {
	parts := strings.Split(line, ":")
	switch len(parts) {
	case 4:
		host, user, pass = parts[0], parts[2], parts[3]
		port, err = strconv.Atoi(parts[1])
	case 2:
		host = parts[0]
		port, err = strconv.Atoi(parts[1])
	default:
		return "", 0, "", "", fmt.Errorf("formato esperado host:port:user:pass")
	}
	if err != nil {
		return "", 0, "", "", fmt.Errorf("porta inválida")
	}
	if strings.TrimSpace(host) == "" || port < 1 || port > 65535 {
		return "", 0, "", "", fmt.Errorf("host/porta inválidos")
	}
	return host, port, user, pass, nil
}

// Import bulk-creates proxies from a pasted list (Webshare host:port:user:pass).
// @Summary      Importar proxies em massa
// @Tags         proxies
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxies/import [post]
func (pc *ProxyController) Import(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	var in proxyImportInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	scheme := normalizeScheme(in.Scheme)
	if !allowedProxySchemes[scheme] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scheme inválido: use 'http' ou 'socks5'"})
		return
	}
	if !cryptobox.IsConfigured() {
		c.JSON(http.StatusInternalServerError, gin.H{"error": cryptobox.ErrNotConfigured.Error()})
		return
	}
	if !proxyGroupOwnedByTenant(db, tenantID, in.ProxyGroupID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "grupo de proxy não encontrado para este tenant"})
		return
	}

	// Dedup: pré-carrega as chaves (scheme,host,port) já existentes no tenant e
	// ignora repetidos dentro do próprio lote — importação em massa insere só os
	// que não são repetidos.
	seen := map[string]bool{}
	{
		type hp struct {
			Scheme string
			Host   string
			Port   int
		}
		var existing []hp
		db.Session(&gorm.Session{NewDB: true}).Model(&models.Proxy{}).
			Where(`"tenantId" = ?`, tenantID).Select("scheme, host, port").Scan(&existing)
		for _, e := range existing {
			seen[proxyKey(e.Scheme, e.Host, e.Port)] = true
		}
	}

	lines := strings.Split(strings.ReplaceAll(in.Raw, "\r\n", "\n"), "\n")
	var toCreate []models.Proxy
	skipped := 0
	duplicates := 0
	// SEGURANÇA: lineErrors NUNCA deve conter o conteúdo bruto da linha — a senha
	// vive ali. Reportar apenas o número da linha + mensagem estática.
	lineErrors := make([]string, 0, 10)
	for idx, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		host, port, user, pass, perr := parseProxyLine(line)
		if perr != nil {
			skipped++
			if len(lineErrors) < 10 {
				lineErrors = append(lineErrors, fmt.Sprintf("linha %d: %s", idx+1, perr.Error()))
			}
			continue
		}
		key := proxyKey(scheme, host, port)
		if seen[key] {
			duplicates++
			continue
		}
		seen[key] = true
		enc, err := cryptobox.Encrypt(pass)
		if err != nil {
			utils.RespondWithInternalError(c, err, "EncryptProxyPassword")
			return
		}
		toCreate = append(toCreate, models.Proxy{
			TenantID: tenantID, Label: in.Label, Scheme: scheme,
			Host: host, Port: port, Username: user, PasswordEnc: enc, Status: "active",
			ProxyGroupID: in.ProxyGroupID,
		})
	}

	created := 0
	if len(toCreate) > 0 {
		if err := db.CreateInBatches(toCreate, 100).Error; err != nil {
			utils.RespondWithInternalError(c, err, "ImportProxies")
			return
		}
		created = len(toCreate)
	}
	c.JSON(http.StatusOK, gin.H{"imported": created, "skipped": skipped, "duplicates": duplicates, "errors": lineErrors})
}

// Update edits a proxy. Password is only re-encrypted when a new one is sent.
// @Summary      Atualizar proxy
// @Tags         proxies
// @Accept       json
// @Produce      json
// @Param        id  path  int  true  "ID do proxy"
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxies/{id} [put]
func (pc *ProxyController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))
	var existing models.Proxy
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&existing).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "proxy não encontrado"})
		return
	}
	var in proxyInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if !validateProxyStrings(c, in) {
		return
	}

	if !proxyGroupOwnedByTenant(db, tenantID, in.ProxyGroupID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "grupo de proxy não encontrado para este tenant"})
		return
	}

	// Endpoint EFETIVO pós-update: usa o valor novo quando veio no payload,
	// senão preserva o existente — precisa disso calculado ANTES de montar o
	// fields map pra saber se o endpoint realmente mudou.
	effScheme := existing.Scheme
	if in.Scheme != "" {
		scheme := normalizeScheme(in.Scheme)
		if !allowedProxySchemes[scheme] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "scheme inválido: use 'http' ou 'socks5'"})
			return
		}
		effScheme = scheme
	}
	effHost := existing.Host
	if strings.TrimSpace(in.Host) != "" {
		effHost = in.Host
	}
	effPort := existing.Port
	if in.Port != 0 {
		if in.Port < 1 || in.Port > 65535 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "port inválido"})
			return
		}
		effPort = in.Port
	}
	endpointChanged := effScheme != existing.Scheme || effHost != existing.Host || effPort != existing.Port

	if endpointChanged && proxyExistsForTenantExcluding(db, tenantID, effScheme, effHost, effPort, id) {
		c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("proxy %s://%s:%d já está cadastrado", effScheme, effHost, effPort)})
		return
	}

	fields := map[string]interface{}{
		"label":        in.Label,
		"username":     in.Username,
		"notes":        in.Notes,
		"proxyGroupId": in.ProxyGroupID,
		"scheme":       effScheme,
		"host":         effHost,
		"port":         effPort,
	}
	if endpointChanged {
		// Endpoint mudou: geo/healthy do endpoint ANTIGO não têm mais nada a ver
		// com o novo — sem isso, um operador atribui "só Fortaleza" e o filtro
		// de cidade continua apontando pro endereço antigo até o próximo teste.
		fields["healthy"] = false
		fields["country"] = ""
		fields["countryCode"] = ""
		fields["city"] = ""
		fields["lastCheckedAt"] = nil
	}
	if in.Password != "" {
		if !cryptobox.IsConfigured() {
			c.JSON(http.StatusInternalServerError, gin.H{"error": cryptobox.ErrNotConfigured.Error()})
			return
		}
		enc, err := cryptobox.Encrypt(in.Password)
		if err != nil {
			utils.RespondWithInternalError(c, err, "EncryptProxyPassword")
			return
		}
		fields["passwordEnc"] = enc
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Proxy{}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).Updates(fields).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateProxy")
		return
	}
	_ = db.Session(&gorm.Session{NewDB: true}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&existing).Error
	c.JSON(http.StatusOK, toProxyResponse(existing))
}

// Delete removes a proxy and detaches it from any connection referencing it.
// @Summary      Remover proxy
// @Tags         proxies
// @Produce      json
// @Param        id  path  int  true  "ID do proxy"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /proxies/{id} [delete]
func (pc *ProxyController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))

	// Detach por modo — FAIL-CLOSED (invariante #4):
	// - single: o proxy era dedicado → vira 'none' (operador reatribui).
	// - group:  proxyId guarda só o pick sticky atual → zerar SÓ proxyId;
	//   preservar proxyMode='group'+proxyGroupId para o pickGroupProxy re-escolher
	//   no próximo start. Flipar pra 'none' aqui vazaria o IP do servidor.
	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Whatsapp{}).
		Where(`"proxyId" = ? AND "tenantId" = ? AND "proxyMode" = ?`, id, tenantID, "single").
		Updates(map[string]interface{}{"proxyId": nil, "proxyMode": "none"}).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DetachProxySingle")
		return
	}
	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Whatsapp{}).
		Where(`"proxyId" = ? AND "tenantId" = ? AND "proxyMode" = ?`, id, tenantID, "group").
		Update("proxyId", nil).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DetachProxyGroup")
		return
	}
	if err := db.Session(&gorm.Session{NewDB: true}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).Delete(&models.Proxy{}).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DeleteProxy")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Proxy removido"})
}

func (pc *ProxyController) setStatus(c *gin.Context, status string) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))
	res := db.Session(&gorm.Session{NewDB: true}).Model(&models.Proxy{}).
		Where(`id = ? AND "tenantId" = ?`, id, tenantID).
		Update("status", status)
	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "SetProxyStatus")
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "proxy não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status atualizado", "status": status})
}

// Test probes the proxy connectivity (server-side, through the proxy) and
// reports the egress IP + latency. Updates healthy/lastCheckedAt. Suporta
// http:// e socks5://.
// @Summary      Testar proxy
// @Tags         proxies
// @Produce      json
// @Param        id  path  int  true  "ID do proxy"
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxies/{id}/test [post]
func (pc *ProxyController) Test(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))
	var p models.Proxy
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&p).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "proxy não encontrado"})
		return
	}
	pass, err := cryptobox.Decrypt(p.PasswordEnc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "falha ao descriptografar senha do proxy"})
		return
	}
	scheme := p.Scheme
	if scheme == "" {
		scheme = "http"
	}
	result := probeProxy(scheme, p.Host, p.Port, p.Username, pass, proxyProbeTimeout)

	now := time.Now()
	// Session(NewDB:true): o db de GetScoped já carrega WHERE tenantId; sem reset
	// o Updates casa 0 linhas (accumulated-conditions) e healthy não persiste.
	fields := map[string]interface{}{"healthy": result.OK, "lastCheckedAt": &now}
	// Só sobrescreve geo quando ela veio de fato (A1: ip-api fora → OK mas geo
	// vazia; não apagar o geo bom já gravado).
	if result.OK && result.Country != "" {
		fields["country"] = result.Country
		fields["countryCode"] = result.CountryCode
		fields["city"] = result.City
	}
	_ = db.Session(&gorm.Session{NewDB: true}).Model(&models.Proxy{}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).
		Updates(fields).Error

	c.JSON(http.StatusOK, result)
}

// TestAll probes every proxy of the tenant concurrently and invalidates the
// ones that fail (status=disabled → out of rotation). Empty pool → no error.
// @Summary      Testar todos os proxies
// @Tags         proxies
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxies/test-all [post]
func (pc *ProxyController) TestAll(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	var proxies []models.Proxy
	if err := db.Where(`"tenantId" = ?`, tenantID).Find(&proxies).Error; err != nil {
		utils.RespondWithInternalError(c, err, "TestAllProxies")
		return
	}
	// Empty pool is NOT an error — just report zero.
	if len(proxies) == 0 {
		c.JSON(http.StatusOK, gin.H{"tested": 0, "ok": 0, "failed": 0})
		return
	}

	results := make([]proxyProbeResult, len(proxies))
	sem := make(chan struct{}, 16) // bounded concurrency
	var wg sync.WaitGroup
	for i := range proxies {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			p := proxies[i]
			pass, derr := cryptobox.Decrypt(p.PasswordEnc)
			if derr != nil {
				return // results[i] fica zero-value (OK=false)
			}
			scheme := p.Scheme
			if scheme == "" {
				scheme = "http"
			}
			results[i] = probeProxy(scheme, p.Host, p.Port, p.Username, pass, 8*time.Second)
		}(i)
	}
	wg.Wait()

	now := time.Now()
	okCount, failCount := 0, 0
	// fresh: o db de GetScoped já tem WHERE tenantId; Session(NewDB:true) evita o
	// accumulated-conditions que faria o Updates casar 0 linhas.
	fresh := func() *gorm.DB { return db.Session(&gorm.Session{NewDB: true}) }
	for i, p := range proxies {
		r := results[i]
		if r.OK {
			okCount++
			upd := map[string]interface{}{"healthy": true, "lastCheckedAt": &now}
			if r.Country != "" { // não apagar geo bom se o ip-api falhou (A1)
				upd["country"] = r.Country
				upd["countryCode"] = r.CountryCode
				upd["city"] = r.City
			}
			_ = fresh().Model(&models.Proxy{}).Where(`id = ? AND "tenantId" = ?`, p.ID, tenantID).
				Updates(upd).Error
		} else {
			failCount++
			_ = fresh().Model(&models.Proxy{}).Where(`id = ? AND "tenantId" = ?`, p.ID, tenantID).
				Updates(map[string]interface{}{"healthy": false, "lastCheckedAt": &now}).Error
			// Invalida: só rebaixa proxies ativos para 'disabled' (preserva
			// isolated/banned, que já estão fora da rotação).
			_ = fresh().Model(&models.Proxy{}).
				Where(`id = ? AND "tenantId" = ? AND status = ?`, p.ID, tenantID, "active").
				Update("status", "disabled").Error
		}
	}
	c.JSON(http.StatusOK, gin.H{"tested": len(proxies), "ok": okCount, "failed": failCount})
}

// DeleteAll removes every proxy of the tenant, detaching connections first.
// Empty pool → no error (deleted: 0).
// @Summary      Remover todos os proxies
// @Tags         proxies
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxies [delete]
func (pc *ProxyController) DeleteAll(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	// Detach any connection that referenced a proxy (single or group).
	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Whatsapp{}).
		Where(`"tenantId" = ? AND "proxyMode" <> ?`, tenantID, "none").
		Updates(map[string]interface{}{"proxyId": nil, "proxyGroupId": nil, "proxyMode": "none"}).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DetachAllProxies")
		return
	}
	res := db.Session(&gorm.Session{NewDB: true}).Where(`"tenantId" = ?`, tenantID).Delete(&models.Proxy{})
	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "DeleteAllProxies")
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": res.RowsAffected})
}

type assignGroupInput struct {
	ProxyIDs     []int `json:"proxyIds"`
	ProxyGroupID *int  `json:"proxyGroupId"`
}

// AssignGroup moves a batch of proxies into a group (ou remove do grupo se
// proxyGroupId nulo). Usado para montar grupos por filtro (ex.: só Fortaleza).
// @Summary      Atribuir proxies a um grupo em massa
// @Tags         proxies
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxies/assign-group [post]
func (pc *ProxyController) AssignGroup(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	var in assignGroupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if len(in.ProxyIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"assigned": 0})
		return
	}
	if !proxyGroupOwnedByTenant(db, tenantID, in.ProxyGroupID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "grupo de proxy não encontrado para este tenant"})
		return
	}
	res := db.Session(&gorm.Session{NewDB: true}).Model(&models.Proxy{}).
		Where(`"tenantId" = ? AND id IN ?`, tenantID, in.ProxyIDs).
		Update("proxyGroupId", in.ProxyGroupID)
	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "AssignProxyGroup")
		return
	}
	c.JSON(http.StatusOK, gin.H{"assigned": res.RowsAffected})
}

// Isolate quarantines a proxy (IP burned by a ban) so it is not reused.
// @Summary      Isolar proxy (anti-contaminação)
// @Tags         proxies
// @Produce      json
// @Param        id  path  int  true  "ID do proxy"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /proxies/{id}/isolate [post]
func (pc *ProxyController) Isolate(c *gin.Context) { pc.setStatus(c, "isolated") }

// Activate returns an isolated/disabled proxy to the active pool.
// @Summary      Reativar proxy
// @Tags         proxies
// @Produce      json
// @Param        id  path  int  true  "ID do proxy"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /proxies/{id}/activate [post]
func (pc *ProxyController) Activate(c *gin.Context) { pc.setStatus(c, "active") }
