package models

import (
	"time"

	"github.com/google/uuid"
)

// ClientAddress is a postal address belonging to a Client (a Client can have
// multiple Addresses). Latitude/Longitude are filled by best-effort geocoding
// (Nominatim/OpenStreetMap) at save time — a separate DAG task, out of scope
// here. GORM does not natively model PostGIS' geography type, so the actual
// spatial column (geog geography(Point,4326)) is created via raw SQL in
// database.go and kept in sync with Latitude/Longitude by whoever writes the
// record — not this model's responsibility.
type ClientAddress struct {
	ID           int       `gorm:"primaryKey" json:"id"`
	ClientID     int       `gorm:"column:clientId;not null" json:"clientId"`
	TenantID     uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	Label        string    `json:"label"`
	ZipCode      string    `gorm:"column:zipCode" json:"zipCode"`
	Street       string    `json:"street"`
	Number       string    `json:"number"`
	Complement   string    `json:"complement"`
	Neighborhood string    `json:"neighborhood"`
	City         string    `json:"city"`
	State        string    `json:"state"`
	IsPrimary    bool      `gorm:"column:isPrimary;not null;default:false" json:"isPrimary"`
	// Latitude/Longitude are nullable — populated best-effort by geocoding;
	// a failed/unavailable geocode leaves them NULL and never blocks the save.
	Latitude  *float64  `gorm:"column:latitude" json:"latitude"`
	Longitude *float64  `gorm:"column:longitude" json:"longitude"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (ClientAddress) TableName() string {
	return "ClientAddresses"
}
