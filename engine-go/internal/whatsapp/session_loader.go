package whatsapp

import (
	"database/sql"

	_ "github.com/lib/pq"
)

// ActiveSession holds the data needed to reconnect a WhatsApp session on startup.
type ActiveSession struct {
	ID          int
	TenantID    string
	Name        string
	SyncHistory bool
	SyncPeriod  string
	KeepAlive   bool
	Wid         string
}

// SessionLoader abstracts the persistence query used by AutoRestartSessions,
// making WhatsAppService testable without a real PostgreSQL connection.
type SessionLoader interface {
	LoadActiveSessions() ([]ActiveSession, error)
}

// PostgresSessionLoader implements SessionLoader against a real PostgreSQL database.
type PostgresSessionLoader struct {
	dsn string
}

// NewPostgresSessionLoader constructs a PostgresSessionLoader for the given DSN.
func NewPostgresSessionLoader(dsn string) *PostgresSessionLoader {
	return &PostgresSessionLoader{dsn: dsn}
}

// LoadActiveSessions returns all WhatsApp sessions that should be auto-reconnected.
func (l *PostgresSessionLoader) LoadActiveSessions() ([]ActiveSession, error) {
	db, err := sql.Open("postgres", l.dsn)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.Query(`SELECT id, "tenantId"::text, name, COALESCE("syncHistory", false), "syncPeriod", COALESCE("keepAlive", false), COALESCE(wid, '') FROM "Whatsapps" WHERE COALESCE("engineType", 'whatsmeow') = 'whatsmeow' AND status IN ('CONNECTED', 'OPENING', 'QRCODE')`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []ActiveSession
	for rows.Next() {
		var s ActiveSession
		var syncPeriod sql.NullString
		if err := rows.Scan(&s.ID, &s.TenantID, &s.Name, &s.SyncHistory, &syncPeriod, &s.KeepAlive, &s.Wid); err != nil {
			return nil, err
		}
		if syncPeriod.Valid {
			s.SyncPeriod = syncPeriod.String
		}
		sessions = append(sessions, s)
	}
	return sessions, rows.Err()
}
