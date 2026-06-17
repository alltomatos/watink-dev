package repository

import (
	"context"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"gorm.io/gorm"
)

var _ domain.SystemRepository = (*GORMSystemRepository)(nil)

type GORMSystemRepository struct {
	db *gorm.DB
}

func NewGORMSystemRepo(db *gorm.DB) *GORMSystemRepository {
	return &GORMSystemRepository{db: db}
}

func (r *GORMSystemRepository) GetTenantConsumption(ctx context.Context) ([]domain.TenantConsumption, error) {
	var result []domain.TenantConsumption
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			t.id::text AS tenant_id,
			t.name AS tenant_name,
			(SELECT COUNT(*) FROM "Users" u WHERE u."tenantId" = t.id) AS users,
			(SELECT COUNT(*) FROM "Contacts" c WHERE c."tenantId" = t.id) AS contacts,
			(SELECT COUNT(*) FROM "Tickets" tk WHERE tk."tenantId" = t.id) AS tickets,
			(SELECT COUNT(*) FROM "Tickets" tk WHERE tk."tenantId" = t.id AND tk.status = 'open') AS open_tickets,
			(SELECT COUNT(*) FROM "Whatsapps" w WHERE w."tenantId" = t.id) AS whatsapps
		FROM "Tenants" t
		ORDER BY tickets DESC, contacts DESC, users DESC
	`).Scan(&result).Error
	if err != nil {
		return nil, err
	}
	return result, nil
}
