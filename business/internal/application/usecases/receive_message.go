package usecases

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
)

// ReceiveMessageInput is the application-layer DTO for inbound WhatsApp messages.
type ReceiveMessageInput struct {
	ID            string
	From          string
	Body          string
	Type          string
	FromMe        bool
	Timestamp     int64
	PushName      string
	GroupName     string
	QuotedMsgID   string
	ProfilePicURL string
	IsLID         bool
	Participant   string
	IsGroup       bool
	MediaURL      string
	MediaData     string
	Mimetype      string
	SessionID     int
	TenantID      uuid.UUID
}

// ReceiveMessageResult returns the entities affected by the inbound message flow.
type ReceiveMessageResult struct {
	Contact *domain.Contact
	Ticket  *domain.Ticket
	Message *domain.Message
}

// ReceiveMessageUseCase handles the business logic for receiving messages.
type ReceiveMessageUseCase struct {
	eventBus    domain.EventBus
	messageRepo domain.MessageRepository
	contactRepo domain.ContactRepository
	ticketRepo  domain.TicketRepository
	queueRepo   domain.QueueRepository
}

func NewReceiveMessageUseCase(
	eventBus domain.EventBus,
	messageRepo domain.MessageRepository,
	contactRepo domain.ContactRepository,
	ticketRepo domain.TicketRepository,
	queueRepo domain.QueueRepository,
) *ReceiveMessageUseCase {
	return &ReceiveMessageUseCase{
		eventBus:    eventBus,
		messageRepo: messageRepo,
		contactRepo: contactRepo,
		ticketRepo:  ticketRepo,
		queueRepo:   queueRepo,
	}
}

// resolveChannelQueue returns the queue to assign to a new ticket: when the
// channel is linked to exactly one queue, that queue is inherited so agents of
// that queue can see the ticket immediately. With 0 or multiple queues it returns
// nil (triage/flow decides).
func (uc *ReceiveMessageUseCase) resolveChannelQueue(ctx context.Context, channelID int, tenantID uuid.UUID) *int {
	if uc.queueRepo == nil {
		return nil
	}
	ids, err := uc.queueRepo.FindQueueIDsByChannel(ctx, channelID, tenantID)
	if err != nil || len(ids) != 1 {
		return nil
	}
	return &ids[0]
}

// Execute processes an incoming message and handles contact, ticket and message persistence.
func (uc *ReceiveMessageUseCase) Execute(ctx context.Context, input ReceiveMessageInput) (*ReceiveMessageResult, error) {
	contactJID := input.From
	if contactJID == "" {
		contactJID = input.Participant
	}
	number := jidNumber(contactJID)
	if number == "" {
		return nil, fmt.Errorf("empty sender number")
	}

	// For groups the contact represents the group itself, so name it with the
	// group subject instead of whichever participant happened to message.
	contactName := input.PushName
	if input.IsGroup && input.GroupName != "" {
		contactName = input.GroupName
	}

	contact, err := uc.contactRepo.FindOrCreate(
		ctx,
		input.TenantID,
		number,
		contactName,
		input.ProfilePicURL,
		input.IsGroup,
		input.IsLID,
		input.From,
	)
	if err != nil {
		return nil, err
	}

	// Self-heal: if a group was previously created with a participant's name,
	// update it to the real group subject once we know it.
	if input.IsGroup && input.GroupName != "" && contact.Name != input.GroupName {
		if err := uc.contactRepo.Update(ctx, contact, map[string]interface{}{"name": input.GroupName}); err == nil {
			contact.Name = input.GroupName
		}
	}

	ticket, err := uc.ticketRepo.FindOpenByContact(ctx, input.TenantID, contact.ID, input.SessionID)
	if err != nil {
		return nil, err
	}
	if ticket == nil {
		ticketStatus := "pending"
		if input.IsGroup {
			ticketStatus = "open"
		}
		ticket, err = uc.ticketRepo.FindOrCreatePending(ctx, &domain.Ticket{
			ContactID:  contact.ID,
			Status:     ticketStatus,
			TenantID:   input.TenantID,
			WhatsappID: input.SessionID,
			IsGroup:    input.IsGroup,
			QueueID:    uc.resolveChannelQueue(ctx, input.SessionID, input.TenantID),
		})
		if err != nil {
			return nil, err
		}
	} else if ticket.IsGroup != input.IsGroup {
		if err := uc.ticketRepo.Update(ctx, ticket, map[string]interface{}{"isGroup": input.IsGroup}); err != nil {
			return nil, err
		}
		ticket.IsGroup = input.IsGroup
	}

	dataJSON, _ := json.Marshal(map[string]interface{}{
		"jid":         contactJID,
		"participant": input.Participant,
		"pushName":    input.PushName, // nome do remetente — exibido na bolha em grupos
		"isGroup":     input.IsGroup,
		"isLid":       input.IsLID,
		"mimetype":    input.Mimetype,
		"mediaData":   input.MediaData,
	})

	mediaType := input.Type
	if mediaType == "" {
		mediaType = "chat"
	}

	createdAt := time.Unix(input.Timestamp, 0)
	if createdAt.IsZero() || input.Timestamp == 0 {
		createdAt = time.Now()
	}

	msg := &domain.Message{
		ID:          input.ID,
		Body:        input.Body,
		TicketID:    ticket.ID,
		ContactID:   &contact.ID,
		FromMe:      input.FromMe,
		TenantID:    input.TenantID,
		MediaType:   mediaType,
		MediaUrl:    input.MediaURL,
		Participant: input.Participant,
		DataJson:    string(dataJSON),
		CreatedAt:   createdAt,
		UpdatedAt:   time.Now(),
	}

	if input.QuotedMsgID != "" {
		exists, err := uc.messageRepo.ExistsByID(ctx, input.QuotedMsgID, input.TenantID)
		if err != nil {
			return nil, err
		}
		if exists {
			msg.QuotedMsgID = &input.QuotedMsgID
		}
	}

	if err := uc.messageRepo.CreateIfNotExists(ctx, msg); err != nil {
		return nil, err
	}

	updates := map[string]interface{}{"lastMessage": msg.Body, "updatedAt": time.Now()}
	if !input.FromMe {
		updates["unreadMessages"] = ticket.UnreadMessages + 1
		ticket.UnreadMessages++
	}
	if err := uc.ticketRepo.Update(ctx, ticket, updates); err != nil {
		return nil, err
	}
	ticket.LastMessage = msg.Body
	ticket.UpdatedAt = time.Now()

	_ = uc.eventBus.Publish(ctx, domain.NewMessageReceivedEvent(msg.ID, ticket.ID, input.TenantID))

	return &ReceiveMessageResult{
		Contact: contact,
		Ticket:  ticket,
		Message: msg,
	}, nil
}

func jidNumber(jid string) string {
	if jid == "" {
		return ""
	}
	base := strings.Split(jid, "@")[0]
	base = strings.Split(base, ":")[0]
	return base
}
