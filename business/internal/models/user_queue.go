package models

// UserQueue is the explicit join table for the User<->Queue many2many relation.
// Defined here so AutoMigrate creates camelCase columns (userId, queueId) matching
// the legacy production schema created by Sequelize.
type UserQueue struct {
	UserID  int `gorm:"column:userId;primaryKey;not null"`
	QueueID int `gorm:"column:queueId;primaryKey;not null"`
}

func (UserQueue) TableName() string { return "user_queues" }
