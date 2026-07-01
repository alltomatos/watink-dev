package models

// UserSetor is the explicit join table for the User<->Setor many2many relation.
// Defined here so AutoMigrate creates camelCase columns (userId, setorId, ehGestor)
// matching the project's join-table convention (see user_queue.go). EhGestor marks
// the user as a manager (Gestor) of that specific Setor — a user can be Gestor of
// multiple Setores simultaneously.
type UserSetor struct {
	UserID   int  `gorm:"column:userId;primaryKey;not null"`
	SetorID  int  `gorm:"column:setorId;primaryKey;not null"`
	EhGestor bool `gorm:"column:ehGestor;default:false"`
}

func (UserSetor) TableName() string { return "user_setores" }
