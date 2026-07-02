package services

import (
	"log"

	"gorm.io/gorm"
)

// SyncClientAddressGeography writes the PostGIS `geog` point for a
// ClientAddress from best-effort geocoded lat/lng. GORM does not model the
// `geography` type natively, so this is raw SQL (see database.go, which
// creates the column). It is best-effort like Geocode itself: nil lat/lng is
// a no-op, and a failed UPDATE is logged as a warning, never returned as a
// fatal error — a missing geog point must never block saving the address.
func SyncClientAddressGeography(db *gorm.DB, addressID int, lat, lng *float64) error {
	if lat == nil || lng == nil {
		return nil
	}

	// ST_MakePoint takes (longitude, latitude) — NOT (latitude, longitude).
	if err := db.Exec(
		`UPDATE "ClientAddresses" SET geog = ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography WHERE id = ?`,
		*lng, *lat, addressID,
	).Error; err != nil {
		log.Printf("geocode: failed to sync geography for ClientAddress %d: %v", addressID, err)
		return nil
	}

	return nil
}
