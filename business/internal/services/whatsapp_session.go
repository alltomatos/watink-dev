package services

import (
	"fmt"
	"log"
	"net"
	"net/url"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/cryptobox"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WhatsAppSessionService struct {
	db        *gorm.DB
	publisher domain.CommandPublisher
	redisSvc  domain.RedisService
	broadcast domain.Broadcaster
}

func NewWhatsAppSessionService(db *gorm.DB, pub domain.CommandPublisher, redisSvc domain.RedisService, broadcast domain.Broadcaster) *WhatsAppSessionService {
	return &WhatsAppSessionService{db: db, publisher: pub, redisSvc: redisSvc, broadcast: broadcast}
}

func (wss *WhatsAppSessionService) StartWhatsAppSession(whatsapp models.Whatsapp, usePairingCode bool, phoneNumber string, force bool) error {
	lockKey := fmt.Sprintf("session:start:%d", whatsapp.ID)
	lockValue := uuid.New().String()

	acquired, err := wss.redisSvc.SetLock(lockKey, lockValue, 10*time.Second)
	if err != nil {
		return err
	}
	if !acquired {
		return fmt.Errorf("ERR_SESSION_STARTING_ALREADY")
	}

	// Resolve the proxy URL UNDER the lock so a concurrent same-connection start
	// (already rejected above) cannot race the rotate/sticky pick + persistence.
	// Fail-closed: if a proxy IS configured but can't be composed (missing key,
	// inactive, decrypt error), refuse to start rather than connect on the bare
	// server IP — that would leak the real egress IP.
	proxyURL, err := wss.composeProxyURL(whatsapp)
	if err != nil {
		_ = wss.redisSvc.DelLock(lockKey)
		return fmt.Errorf("proxy configuration error: %w", err)
	}

	// Update Status — CRITICAL: tenant-scoped
	if err := wss.db.Model(&whatsapp).Where("id = ? AND \"tenantId\" = ?", whatsapp.ID, whatsapp.TenantID).Update("status", "OPENING").Error; err != nil {
		return err
	}

	// Emit via Socket (via injected broadcast)
	wss.broadcast.EmitToTenantRoom(whatsapp.TenantID.String(), "whatsappSession", map[string]interface{}{
		"action":  "update",
		"session": whatsapp,
	})

	// RabbitMQ Command
	command := map[string]interface{}{
		"id":        uuid.New().String(),
		"timestamp": time.Now().UnixMilli(),
		"tenantId":  whatsapp.TenantID,
		"type":      "session.start",
		"payload": map[string]interface{}{
			"sessionId":      whatsapp.ID,
			"usePairingCode": usePairingCode,
			"phoneNumber":    phoneNumber,
			"name":           whatsapp.Name,
			"syncHistory":    whatsapp.SyncHistory,
			"syncPeriod":     whatsapp.SyncPeriod,
			"keepAlive":      whatsapp.KeepAlive,
			"force":          force,
			"wid":            whatsapp.Wid,
			// proxyUrl carrega scheme://user:pass@host:port (credencial em claro).
			// NUNCA logar este payload — o engine o consome via env.Payload.proxyUrl.
			"proxyUrl": proxyURL,
		},
	}

	routingKey := fmt.Sprintf("wbot.%s.%d.session.start", whatsapp.TenantID, whatsapp.ID)
	return wss.publisher.PublishCommand(routingKey, command)
}

// composeProxyURL builds the proxy URL for the connection, decrypting the
// password. Returns "" when no proxy is assigned (ProxyMode "none"). Returns an
// error (fail-closed) when a proxy IS assigned but unusable.
func (wss *WhatsAppSessionService) composeProxyURL(whatsapp models.Whatsapp) (string, error) {
	p, err := wss.resolveProxy(whatsapp)
	if err != nil {
		return "", err
	}
	if p == nil {
		return "", nil
	}
	pass, err := cryptobox.Decrypt(p.PasswordEnc)
	if err != nil {
		return "", fmt.Errorf("falha ao descriptografar senha do proxy %d: %w", p.ID, err)
	}
	scheme := p.Scheme
	if scheme == "" {
		scheme = "http"
	}
	// net.JoinHostPort coloca colchetes em hosts IPv6 (ex: [::1]:1080).
	u := url.URL{Scheme: scheme, Host: net.JoinHostPort(p.Host, strconv.Itoa(p.Port))}
	if p.Username != "" || pass != "" {
		u.User = url.UserPassword(p.Username, pass)
	}
	return u.String(), nil
}

// resolveProxy returns the active proxy a connection should use, or nil when
// ProxyMode is "none". Fail-closed on any misconfiguration.
func (wss *WhatsAppSessionService) resolveProxy(whatsapp models.Whatsapp) (*models.Proxy, error) {
	switch whatsapp.ProxyMode {
	case "single":
		if whatsapp.ProxyID == nil {
			return nil, fmt.Errorf("proxyMode=single sem proxyId na conexão %d", whatsapp.ID)
		}
		var p models.Proxy
		if err := wss.db.Where(`id = ? AND "tenantId" = ?`, *whatsapp.ProxyID, whatsapp.TenantID).First(&p).Error; err != nil {
			return nil, fmt.Errorf("proxy %d não encontrado para a conexão %d: %w", *whatsapp.ProxyID, whatsapp.ID, err)
		}
		if p.Status != "active" {
			// Comum após auto-isolação por ban: o proxy single foi isolado e a
			// conexão não reconecta nele de propósito (IP queimado). Mensagem
			// acionável p/ o operador (sai no toast de erro do reconectar).
			return nil, fmt.Errorf("proxy %d está %s (provável ban anterior) — reatribua um proxy ativo à conexão ou reative-o em Configurações > Proxy antes de reconectar", p.ID, p.Status)
		}
		return &p, nil
	case "group":
		return wss.pickGroupProxy(whatsapp)
	default:
		return nil, nil
	}
}

// pickGroupProxy selects a proxy from the connection's proxy group.
//   - sticky: reuse the current ProxyID if it is still active and in the group;
//     otherwise pick the least-recently-used active one and persist it.
//   - rotate: always pick the least-recently-used active one and persist it,
//     so the egress IP advances on each (re)connect.
//
// Isolated/banned proxies are excluded (status != active), so the ban-isolation
// guard (PR3) automatically removes a burned IP from the pool.
func (wss *WhatsAppSessionService) pickGroupProxy(whatsapp models.Whatsapp) (*models.Proxy, error) {
	if whatsapp.ProxyGroupID == nil {
		return nil, fmt.Errorf("proxyMode=group sem proxyGroupId na conexão %d", whatsapp.ID)
	}
	var group models.ProxyGroup
	if err := wss.db.Where(`id = ? AND "tenantId" = ?`, *whatsapp.ProxyGroupID, whatsapp.TenantID).First(&group).Error; err != nil {
		return nil, fmt.Errorf("grupo de proxy %d não encontrado para a conexão %d: %w", *whatsapp.ProxyGroupID, whatsapp.ID, err)
	}

	// Sticky: keep the current pick if it is still active and in this group.
	if group.RotationStrategy != "rotate" && whatsapp.ProxyID != nil {
		var cur models.Proxy
		if err := wss.db.Where(`id = ? AND "tenantId" = ? AND "proxyGroupId" = ? AND status = ?`,
			*whatsapp.ProxyID, whatsapp.TenantID, group.ID, "active").First(&cur).Error; err == nil {
			return &cur, nil
		}
	}

	// Atomic LRU pick: a single UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP
	// LOCKED) bumps lastUsedAt and RETURNs the row. SKIP LOCKED guarantees two
	// connections starting concurrently against the same group cannot grab the
	// same proxy, so rotate spreads correctly even under races. A failed bump
	// surfaces as no row → fail-closed (we never silently reuse a stale IP).
	var p models.Proxy
	err := wss.db.Raw(`
		UPDATE "Proxies" SET "lastUsedAt" = now()
		WHERE id = (
			SELECT id FROM "Proxies"
			WHERE "tenantId" = ? AND "proxyGroupId" = ? AND status = 'active'
			ORDER BY "lastUsedAt" ASC NULLS FIRST
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		)
		RETURNING *`, whatsapp.TenantID, group.ID).Scan(&p).Error
	if err != nil || p.ID == 0 {
		return nil, fmt.Errorf("nenhum proxy ativo disponível no grupo %d para a conexão %d", group.ID, whatsapp.ID)
	}

	// Persist the sticky pick. Non-fatal (the returned proxy is still used), but
	// log so a broken sticky/rotate guarantee is observable.
	if err := wss.db.Model(&models.Whatsapp{}).
		Where(`id = ? AND "tenantId" = ?`, whatsapp.ID, whatsapp.TenantID).
		Update("proxyId", p.ID).Error; err != nil {
		log.Printf("warn: falha ao persistir proxyId sticky da conexão %d: %v", whatsapp.ID, err)
	}
	return &p, nil
}

func (wss *WhatsAppSessionService) StopWhatsAppSession(whatsapp models.Whatsapp) error {
	routingKey, command := wss.buildSessionCommand(whatsapp, "session.stop")
	return wss.publishWhatsAppSessionCommand(routingKey, command)
}

func (wss *WhatsAppSessionService) DeleteWhatsAppSession(whatsapp models.Whatsapp) error {
	routingKey, command := wss.buildDeleteSessionCommand(whatsapp)
	return wss.publishWhatsAppSessionCommand(routingKey, command)
}

func (wss *WhatsAppSessionService) buildDeleteSessionCommand(whatsapp models.Whatsapp) (string, map[string]interface{}) {
	return wss.buildSessionCommand(whatsapp, "session.delete")
}

func (wss *WhatsAppSessionService) buildSessionCommand(whatsapp models.Whatsapp, commandType string) (string, map[string]interface{}) {
	command := map[string]interface{}{
		"id":        uuid.New().String(),
		"timestamp": time.Now().UnixMilli(),
		"tenantId":  whatsapp.TenantID,
		"type":      commandType,
		"payload": map[string]interface{}{
			"sessionId": whatsapp.ID,
		},
	}

	routingKey := fmt.Sprintf("wbot.%s.%d.%s", whatsapp.TenantID, whatsapp.ID, commandType)
	return routingKey, command
}

func (wss *WhatsAppSessionService) publishWhatsAppSessionCommand(routingKey string, command map[string]interface{}) error {
	return wss.publisher.PublishCommand(routingKey, command)
}

// Legacy global functions — deprecated. Use NewWhatsAppSessionService instead.
// Kept for compilation and to fail-closed.
func StartWhatsAppSession(whatsapp models.Whatsapp, usePairingCode bool, phoneNumber string, force bool) error {
	return fmt.Errorf("legacy global functions disabled — use NewWhatsAppSessionService(db, pub, redisSvc, broadcast)")
}

func StopWhatsAppSession(whatsapp models.Whatsapp) error {
	return fmt.Errorf("legacy global functions disabled — use NewWhatsAppSessionService(db, pub, redisSvc, broadcast)")
}

func DeleteWhatsAppSession(whatsapp models.Whatsapp) error {
	return fmt.Errorf("legacy global functions disabled — use NewWhatsAppSessionService(db, pub, redisSvc, broadcast)")
}
