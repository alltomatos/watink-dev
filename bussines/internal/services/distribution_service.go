package services

import (
	"log"

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

func (s *DistributionService) DistributeTicket(ticketID int, queueID int, tenantID uuid.UUID) error {
	var ticket models.Ticket
	if err := s.db.Where("id = ? AND \"tenantId\" = ?", ticketID, tenantID).First(&ticket).Error; err != nil {
		return err
	}

	var queue models.Queue
	if err := s.db.Where("id = ? AND \"tenantId\" = ?", queueID, tenantID).First(&queue).Error; err != nil {
		return err
	}

	strategy := queue.DistributionStrategy
	
	// 1. Prioridade de Carteira (Wallet)
	if queue.PrioritizeWallet {
		var contact models.Contact
		if err := s.db.Where("id = ? AND \"tenantId\" = ?", ticket.ContactID, tenantID).First(&contact).Error; err == nil {
			if contact.WalletUserID != nil {
				// Verifica se este usuário da carteira está na fila
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

	if strategy == "" || strategy == "MANUAL" {
		log.Printf("[Distribution] Strategy MANUAL for Ticket %d. No user assigned.", ticketID)
		return nil
	}

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

	switch strategy {
	case "AUTO_ROUND_ROBIN": // Round Robin
		assignedUserID = s.getRoundRobinUser(users, queueID, tenantID)
	case "AUTO_BALANCED":
		assignedUserID = s.getBalancedUser(users, tenantID)
	default:
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

func (s *DistributionService) getRoundRobinUser(users []models.User, queueID int, tenantID uuid.UUID) int {
	var lastTicket models.Ticket
	// Busca o último ticket desta fila que teve um usuário atribuído
	err := s.db.Where("\"queueId\" = ? AND \"tenantId\" = ? AND \"userId\" IS NOT NULL", queueID, tenantID).
		Order("id desc").
		First(&lastTicket).Error

	if err != nil {
		// Se não tem ticket anterior, pega o primeiro usuário
		return users[0].ID
	}

	// Encontra a posição do último usuário na lista
	lastIdx := -1
	for i, u := range users {
		if lastTicket.UserID != nil && u.ID == *lastTicket.UserID {
			lastIdx = i
			break
		}
	}

	// Próximo usuário (circular)
	nextIdx := (lastIdx + 1) % len(users)
	return users[nextIdx].ID
}

func (s *DistributionService) getBalancedUser(users []models.User, tenantID uuid.UUID) int {
	type UserCount struct {
		UserID int
		Count  int64
	}

	var userIDs []int
	for _, u := range users {
		userIDs = append(userIDs, u.ID)
	}

	// Busca a contagem de tickets 'open' para cada usuário da lista
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

	// Encontra o usuário com menos tickets
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
