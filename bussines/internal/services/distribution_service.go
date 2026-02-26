package services

import (
	"log"
	"strings"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DistributionService struct {
	db *gorm.DB
}

func NewDistributionService() *DistributionService {
	return &DistributionService{
		db: database.DB,
	}
}

// DistributeTicket orquestra a atribuição de um ticket a um usuário baseado na estratégia da fila.
func (s *DistributionService) DistributeTicket(ticketID int, queueID int, tenantID uuid.UUID) error {
	var ticket models.Ticket
	if err := s.db.Where("id = ? AND \"tenantId\" = ?", ticketID, tenantID).First(&ticket).Error; err != nil {
		return err
	}

	// Se o ticket já tiver um dono, não redistribui automaticamente
	if ticket.UserID != nil {
		return nil
	}

	var queue models.Queue
	if err := s.db.Where("id = ? AND \"tenantId\" = ?", queueID, tenantID).First(&queue).Error; err != nil {
		return err
	}

	// Normaliza a estratégia para maiúsculas (compatibilidade Opencore <-> Business)
	strategy := strings.ToUpper(queue.DistributionStrategy)
	
	// 1. Prioridade de Carteira (Wallet)
	// Se ativado, tenta entregar para o dono do contato antes de qualquer rodízio
	if queue.PrioritizeWallet {
		var contact models.Contact
		if err := s.db.Where("id = ? AND \"tenantId\" = ?", ticket.ContactID, tenantID).First(&contact).Error; err == nil {
			if contact.WalletUserID != nil {
				// Verifica se o dono da carteira está vinculado a esta fila
				var count int64
				s.db.Table("UserQueues").Where("\"userId\" = ? AND \"queueId\" = ?", *contact.WalletUserID, queueID).Count(&count)
				
				if count > 0 {
					if err := s.db.Model(&ticket).Updates(map[string]interface{}{
						"userId": *contact.WalletUserID,
						"status": "open",
					}).Error; err == nil {
						log.Printf("[Distribution] Ticket %d assigned to Wallet Owner %d", ticketID, *contact.WalletUserID)
						s.emitUpdate(ticket)
						return nil
					}
				}
			}
		}
	}

	// Estratégias que NÃO atribuem dono automaticamente:
	// MANUAL: O admin/agente atribui manualmente.
	// FISHER / PESCA: O ticket fica "disponível" para quem quiser pegar primeiro.
	if strategy == "" || strategy == "MANUAL" || strategy == "FISHER" || strategy == "PESCA" {
		log.Printf("[Distribution] Strategy %s for Ticket %d. Keeping unassigned for manual/fishing.", strategy, ticketID)
		return nil
	}

	// Busca usuários vinculados à fila
	var users []models.User
	if err := s.db.Joins("JOIN \"UserQueues\" uq ON uq.\"userId\" = \"Users\".id").
		Where("uq.\"queueId\" = ? AND \"Users\".\"tenantId\" = ?", queueID, tenantID).
		Find(&users).Error; err != nil {
		return err
	}

	if len(users) == 0 {
		log.Printf("[Distribution] No users found for Queue %d. Keeping ticket unassigned.", queueID)
		return nil
	}

	var assignedUserID int

	// Mapeamento Bilíngue: Suporte total a strings do Opencore e do Business
	switch strategy {
	case "AUTO_ROUND_ROBIN", "ROUND_ROBIN", "RODIZIO":
		assignedUserID = s.getRoundRobinUser(users, queueID, tenantID)
	case "AUTO_BALANCED", "BALANCED", "BALANCEADO":
		assignedUserID = s.getBalancedUser(users, tenantID)
	default:
		log.Printf("[Distribution] Unknown strategy %s for Ticket %d. Defaulting to manual.", strategy, ticketID)
		return nil
	}

	if assignedUserID != 0 {
		if err := s.db.Model(&ticket).Updates(map[string]interface{}{
			"userId": assignedUserID,
			"status": "open",
		}).Error; err != nil {
			return err
		}
		log.Printf("[Distribution] Ticket %d assigned to User %d via %s", ticketID, assignedUserID, strategy)
		
		s.emitUpdate(ticket)
	}

	return nil
}

func (s *DistributionService) emitUpdate(ticket models.Ticket) {
	EmitToNamespace("/", "ticket", map[string]interface{}{
		"action": "update",
		"ticket": ticket,
	})
}

// getRoundRobinUser implementa o rodízio circular baseado no último ticket atribuído na fila.
func (s *DistributionService) getRoundRobinUser(users []models.User, queueID int, tenantID uuid.UUID) int {
	var lastTicket models.Ticket
	// Busca o último ticket desta fila que teve um usuário atribuído manualmente ou via rodízio
	err := s.db.Where("\"queueId\" = ? AND \"tenantId\" = ? AND \"userId\" IS NOT NULL", queueID, tenantID).
		Order("id desc").
		First(&lastTicket).Error

	if err != nil {
		// Se for o primeiro ticket da fila, começa pelo primeiro usuário da lista
		return users[0].ID
	}

	// Localiza o índice do último usuário sorteado na lista atual da fila
	lastIdx := -1
	for i, u := range users {
		if lastTicket.UserID != nil && u.ID == *lastTicket.UserID {
			lastIdx = i
			break
		}
	}

	// Seleciona o próximo usuário (volta ao início se chegar ao fim da lista)
	nextIdx := (lastIdx + 1) % len(users)
	return users[nextIdx].ID
}

// getBalancedUser implementa a distribuição por carga (quem tem menos tickets 'open' no momento).
func (s *DistributionService) getBalancedUser(users []models.User, tenantID uuid.UUID) int {
	type UserCount struct {
		UserID int
		Count  int64
	}

	var userIDs []int
	for _, u := range users {
		userIDs = append(userIDs, u.ID)
	}

	// Contagem em tempo real de tickets abertos para cada agente da fila
	var results []UserCount
	s.db.Model(&models.Ticket{}).
		Select("\"userId\" as user_id, count(*) as count").
		Where("\"userId\" IN ? AND status = 'open' AND \"tenantId\" = ?", userIDs, tenantID).
		Group("\"userId\"").
		Scan(&results)

	counts := make(map[int]int64)
	for _, r := range results {
		counts[r.UserID] = r.Count
	}

	// Algoritmo de menor carga
	minCount := int64(999999)
	bestUserID := users[0].ID

	for _, u := range users {
		c := counts[u.ID]
		if c < minCount {
			minCount = c
			bestUserID = u.ID
		}
	}

	return bestUserID
}
