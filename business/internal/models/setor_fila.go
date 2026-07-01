package models

// SetorFila is the explicit join table for the Setor<->Queue many2many relation.
// Defined here so AutoMigrate creates camelCase columns (setorId, queueId) matching
// the project's join-table convention (see user_queue.go). A Setor may cover 1+
// Queues; Ticket visibility for a Setor's members derives from this link without
// changing the existing Queue distribution engine.
type SetorFila struct {
	SetorID int `gorm:"column:setorId;primaryKey;not null"`
	QueueID int `gorm:"column:queueId;primaryKey;not null"`
}

func (SetorFila) TableName() string { return "setor_filas" }
