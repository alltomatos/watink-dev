package services

import (
	"github.com/alltomatos/watinkdev/business/internal/models"
	"gorm.io/gorm"
)

type SetupService struct {
	db *gorm.DB
}

func NewSetupService(db *gorm.DB) *SetupService {
	return &SetupService{db: db}
}

type TenantSeedData struct {
	FirstName  string
	LastName   string
	Email      string
	Password   string
	Document   string
	BackendURL string
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

		// 4. Admin Group
		group := models.Group{Name: "Admin", TenantID: tenant.ID}
		if err := tx.Create(&group).Error; err != nil {
			return err
		}

		// 5. Assign all permissions to group
		var perms []models.Permission
		if err := tx.Find(&perms).Error; err != nil {
			return err
		}
		for _, p := range perms {
			if err := tx.Exec("INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)", group.ID, p.ID).Error; err != nil {
				return err
			}
		}

		// 6. Superadmin User
		user := models.User{
			Name:     data.FirstName + " " + data.LastName,
			Email:    data.Email,
			Profile:  "superadmin",
			TenantID: tenant.ID,
			GroupID:  &group.ID,
			Configs:  `{"dashboard":{"widgets":[{"id":"tickets_info","visible":true,"width":4,"order":1},{"id":"attendance_chart","visible":true,"width":8,"order":2}]}}`,
		}
		if err := user.HashPassword(data.Password); err != nil {
			return err
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		// 7. Update Tenant Owner
		if err := tx.Model(&tenant).Update("ownerId", user.ID).Error; err != nil {
			return err
		}

		// 8. Day-0 Assets: Queue
		queue := models.Queue{
			Name:                 "Atendimento Inicial",
			Color:                "#000000",
			TenantID:             tenant.ID,
			DistributionStrategy: "MANUAL",
		}
		if err := tx.Create(&queue).Error; err != nil {
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