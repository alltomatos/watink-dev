// Package services — message event handlers are split by event type:
//   - event_listener_msg_media.go    — handleMediaDownloaded
//   - event_listener_msg_ack.go      — handleMessageAck
//   - event_listener_msg_revoke.go   — handleMessageRevoke
//   - event_listener_msg_reaction.go — handleMessageReaction
package services

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// handlePollVote records a contact's vote on a poll message.
// It only persists the result if the originating QuickAnswer has capture_results: true.
func (el *EventListener) handlePollVote(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	if el.db == nil {
		log.Printf("[handlePollVote] db is nil — cannot persist PollResult")
		return nil
	}

	var p PollVotePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	if p.PollMessageID == "" || p.VoterJID == "" {
		log.Printf("[handlePollVote] missing required fields: pollMessageId=%q voterJid=%q", p.PollMessageID, p.VoterJID)
		return nil
	}

	msg, err := el.messages.FindByID(ctx, p.PollMessageID, tenantID)
	if err != nil {
		log.Printf("[handlePollVote] message %s not found: %v", p.PollMessageID, err)
		return nil
	}
	if msg == nil {
		log.Printf("[handlePollVote] message %s not found (nil)", p.PollMessageID)
		return nil
	}

	// If the message carries a quickAnswerId, check capture_results before persisting.
	if msg.DataJson != "" && msg.DataJson != "{}" {
		var msgData map[string]interface{}
		if err := json.Unmarshal([]byte(msg.DataJson), &msgData); err == nil {
			if rawQAID, ok := msgData["quickAnswerId"]; ok {
				var qaID float64
				switch v := rawQAID.(type) {
				case float64:
					qaID = v
				case json.Number:
					f, _ := v.Float64()
					qaID = f
				}

				if qaID > 0 {
					var qa models.QuickAnswer
					if err := el.db.Session(&gorm.Session{NewDB: true}).
						Where("id = ? AND \"tenantId\" = ?", int(qaID), tenantID).
						First(&qa).Error; err != nil {
						log.Printf("[handlePollVote] QuickAnswer %d not found: %v", int(qaID), err)
						return nil
					}

					var qaContent map[string]interface{}
					if err := json.Unmarshal([]byte(qa.Content), &qaContent); err != nil || qaContent == nil {
						return nil
					}
					captureRaw, exists := qaContent["capture_results"]
					if !exists {
						return nil
					}
					capture, _ := captureRaw.(bool)
					if !capture {
						return nil
					}
				}
			}
		}
	}

	result := models.PollResult{
		PollMessageID:  p.PollMessageID,
		ContactJID:     p.VoterJID,
		OptionSelected: p.OptionSelected,
		AnsweredAt:     time.Now(),
	}

	if err := el.db.Session(&gorm.Session{NewDB: true}).Create(&result).Error; err != nil {
		log.Printf("[handlePollVote] failed to create PollResult: %v", err)
		return err
	}

	log.Printf("[handlePollVote] recorded vote: msg=%s voter=%s option=%q", p.PollMessageID, p.VoterJID, p.OptionSelected)
	return nil
}
