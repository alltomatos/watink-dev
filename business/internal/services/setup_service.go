package services

import (
	"context"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"gorm.io/gorm"
)

type SetupService struct {
	db *gorm.DB
}

func NewSetupService(db *gorm.DB) *SetupService {
	return &SetupService{db: db}
}

// TenantSeedData is an alias kept for backwards compat with callers inside this package.
type TenantSeedData = domain.TenantSeedData

func (s *SetupService) NeedsSetup(ctx context.Context) (bool, error) {
	var usersCount, tenantsCount int64
	if err := s.db.WithContext(ctx).Model(&models.User{}).Count(&usersCount).Error; err != nil {
		return false, err
	}
	if err := s.db.WithContext(ctx).Model(&models.Tenant{}).Count(&tenantsCount).Error; err != nil {
		return false, err
	}
	return usersCount == 0 && tenantsCount == 0, nil
}

func (s *SetupService) InitializeTenant(data TenantSeedData) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Plan
		var plan models.Plan
		err := tx.Where("name = ?", "Community").First(&plan).Error
		if err != nil {
			if err != gorm.ErrRecordNotFound {
				return err
			}
			plan = models.Plan{Name: "Community", PluginQuota: 10, Active: true}
			if err := tx.Create(&plan).Error; err != nil {
				return err
			}
		}

		// 2. Tenant
		tenant := models.Tenant{
			Name:     data.FirstName + "'s Workspace",
			Status:   "active",
			Document: data.Document,
		}
		// Helper para GORM com SQLite: desabilita RETURNING (incompatível)
		// Em produção PG funciona nativamente, aqui forçamos insert básico
		if err := tx.Session(&gorm.Session{CreateBatchSize: 1}).Create(&tenant).Error; err != nil {
			return err
		}

		// 3. Subscription
		sub := models.TenantSubscription{
			TenantID: tenant.ID,
			PlanID:   plan.ID,
			Status:   "active",
		}
		if err := tx.Create(&sub).Error; err != nil {
			return err
		}

		// 4. Cargos-padrão do tenant (ADR 0022): Atendente, Gestor, Gerente Geral,
		// Administrador. Cada um herda o conjunto do anterior + permissões extras.
		var allPerms []models.Permission
		if err := tx.Find(&allPerms).Error; err != nil {
			return err
		}
		permByName := make(map[string]models.Permission, len(allPerms))
		for _, p := range allPerms {
			permByName[p.GetName()] = p
		}
		lookupPerms := func(names ...string) []models.Permission {
			out := make([]models.Permission, 0, len(names))
			for _, n := range names {
				if p, ok := permByName[n]; ok {
					out = append(out, p)
				}
			}
			return out
		}

		atendentePermNames := []string{
			"tickets:read", "tickets:create", "tickets:update",
			"contacts:read", "contacts:create", "contacts:update",
		}
		atendenteCargo := models.Cargo{Name: "Atendente", TenantID: tenant.ID}
		if err := tx.Create(&atendenteCargo).Error; err != nil {
			return err
		}
		if err := tx.Model(&atendenteCargo).Association("Permissions").Append(lookupPerms(atendentePermNames...)); err != nil {
			return err
		}

		gestorPermNames := append(append([]string{}, atendentePermNames...),
			"tickets:reassign", "tickets:close", "tickets:export",
			"reports:view-sector", "users:read", "setores:read",
		)
		gestorCargo := models.Cargo{Name: "Gestor", TenantID: tenant.ID}
		if err := tx.Create(&gestorCargo).Error; err != nil {
			return err
		}
		if err := tx.Model(&gestorCargo).Association("Permissions").Append(lookupPerms(gestorPermNames...)); err != nil {
			return err
		}

		gerenteGeralPermNames := append(append([]string{}, gestorPermNames...),
			"reports:view-tenant", "users:manage", "setores:manage", "cargos:read",
		)
		gerenteGeralCargo := models.Cargo{Name: "Gerente Geral", TenantID: tenant.ID}
		if err := tx.Create(&gerenteGeralCargo).Error; err != nil {
			return err
		}
		if err := tx.Model(&gerenteGeralCargo).Association("Permissions").Append(lookupPerms(gerenteGeralPermNames...)); err != nil {
			return err
		}

		adminCargo := models.Cargo{Name: "Administrador", TenantID: tenant.ID}
		if err := tx.Create(&adminCargo).Error; err != nil {
			return err
		}
		if err := tx.Model(&adminCargo).Association("Permissions").Append(allPerms); err != nil {
			return err
		}

		// 5. Administrador User
		user := models.User{
			Name:     data.FirstName + " " + data.LastName,
			Email:    data.Email,
			CargoID:  &adminCargo.ID,
			Alcance:  "tenant",
			TenantID: tenant.ID,
			Configs:  `{"dashboard":{"widgets":[{"id":"tickets_info","visible":true,"width":4,"order":1},{"id":"attendance_chart","visible":true,"width":8,"order":2}]}}`,
		}
		if err := user.HashPassword(data.Password); err != nil {
			return err
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		// 6. Update Tenant Owner
		if err := tx.Model(&tenant).Update("ownerId", user.ID).Error; err != nil {
			return err
		}

		// 7. Day-0 Assets: Queue (criada antes do Setor para vincular via SetorFila)
		queue := models.Queue{
			Name:                 "Atendimento Inicial",
			Color:                "#000000",
			TenantID:             tenant.ID,
			DistributionStrategy: "MANUAL",
		}
		if err := tx.Create(&queue).Error; err != nil {
			return err
		}

		// 8. Day-0 Assets: Setor inicial, vinculado à Queue e ao Administrador (gestor)
		setor := models.Setor{Name: "Geral", TenantID: tenant.ID}
		if err := tx.Create(&setor).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.SetorFila{SetorID: setor.ID, QueueID: queue.ID}).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.UserSetor{UserID: user.ID, SetorID: setor.ID, EhGestor: true}).Error; err != nil {
			return err
		}

		// 9. Day-0 Assets: Tag
		tag := models.Tag{
			Name:     "Novo Cliente",
			Color:    "#28a745",
			TenantID: tenant.ID,
		}
		if err := tx.Create(&tag).Error; err != nil {
			return err
		}

		// 10. Default Settings
		settings := []models.Setting{
			{Key: "systemTitle", Value: "Watink", TenantID: tenant.ID},
			{Key: "systemLogo", Value: "/logo.png", TenantID: tenant.ID},
			{Key: "systemLogoEnabled", Value: "true", TenantID: tenant.ID},
			{Key: "login_layout", Value: "centered", TenantID: tenant.ID},
			{Key: "login_backgroundImage", Value: "", TenantID: tenant.ID},
		}
		if data.BackendURL != "" {
			settings = append(settings, models.Setting{Key: "backendUrl", Value: data.BackendURL, TenantID: tenant.ID})
		}
		if err := tx.Create(&settings).Error; err != nil {
			return err
		}

		return nil
	})
}
