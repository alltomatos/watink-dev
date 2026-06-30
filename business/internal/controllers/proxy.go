package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/cryptobox"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

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
		"healthy":       p.Healthy,
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
	Label    string `json:"label"`
	Scheme   string `json:"scheme"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Notes    string `json:"notes"`
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

	p := models.Proxy{
		TenantID: tenantID, Label: in.Label, Scheme: scheme,
		Host: in.Host, Port: in.Port, Username: in.Username,
		PasswordEnc: enc, Status: "active", Notes: in.Notes,
	}
	if err := db.Create(&p).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateProxy")
		return
	}
	c.JSON(http.StatusOK, toProxyResponse(p))
}

type proxyImportInput struct {
	Raw    string `json:"raw"`
	Scheme string `json:"scheme"`
	Label  string `json:"label"`
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

	lines := strings.Split(strings.ReplaceAll(in.Raw, "\r\n", "\n"), "\n")
	var toCreate []models.Proxy
	skipped := 0
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
		enc, err := cryptobox.Encrypt(pass)
		if err != nil {
			utils.RespondWithInternalError(c, err, "EncryptProxyPassword")
			return
		}
		toCreate = append(toCreate, models.Proxy{
			TenantID: tenantID, Label: in.Label, Scheme: scheme,
			Host: host, Port: port, Username: user, PasswordEnc: enc, Status: "active",
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
	c.JSON(http.StatusOK, gin.H{"imported": created, "skipped": skipped, "errors": lineErrors})
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

	fields := map[string]interface{}{
		"label":    in.Label,
		"username": in.Username,
		"notes":    in.Notes,
	}
	if in.Scheme != "" {
		scheme := normalizeScheme(in.Scheme)
		if !allowedProxySchemes[scheme] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "scheme inválido: use 'http' ou 'socks5'"})
			return
		}
		fields["scheme"] = scheme
	}
	if strings.TrimSpace(in.Host) != "" {
		fields["host"] = in.Host
	}
	if in.Port != 0 {
		if in.Port < 1 || in.Port > 65535 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "port inválido"})
			return
		}
		fields["port"] = in.Port
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

	if err := db.Model(&models.Proxy{}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).Updates(fields).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateProxy")
		return
	}
	_ = db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&existing).Error
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

	// Detach from any connection so we never leave a dangling proxyId.
	if err := db.Model(&models.Whatsapp{}).
		Where(`"proxyId" = ? AND "tenantId" = ?`, id, tenantID).
		Updates(map[string]interface{}{"proxyId": nil, "proxyMode": "none"}).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DetachProxy")
		return
	}
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).Delete(&models.Proxy{}).Error; err != nil {
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
	res := db.Model(&models.Proxy{}).
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
