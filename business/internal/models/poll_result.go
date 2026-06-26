package models

import "time"

type PollResult struct {
	ID             int       `gorm:"primaryKey" json:"id"`
	PollMessageID  string    `gorm:"column:pollMessageId;not null" json:"pollMessageId"`
	ContactJID     string    `gorm:"column:contactJid;not null" json:"contactJid"`
	OptionSelected string    `gorm:"column:optionSelected;not null" json:"optionSelected"`
	AnsweredAt     time.Time `gorm:"column:answeredAt" json:"answeredAt"`
}

func (PollResult) TableName() string {
	return "PollResults"
}
