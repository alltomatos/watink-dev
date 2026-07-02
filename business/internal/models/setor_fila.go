package models

// SetorFila is the explicit join table for the Setor<->Queue many2many relation.
// Defined here so AutoMigrate creates camelCase columns (setorId, queueId) matching
// the project's join-table convention (see user_queue.go). A Setor may cover 1+
// Queues (M:N). NOTE: deriving Ticket visibility for a Setor's members from this
// link is NOT implemented yet (roadmap) — ListTickets is tenant-scoped + filters
// by queueIds from the client query string, not from the user's Setor(es). This
// table currently only records the Setor<->Queue association.
type SetorFila struct {
	SetorID int `gorm:"column:setorId;primaryKey;not null"`
	QueueID int `gorm:"column:queueId;primaryKey;not null"`
}

func (SetorFila) TableName() string { return "setor_filas" }
