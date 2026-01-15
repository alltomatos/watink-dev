"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Get all Tenant IDs
        let tenants = [];
        try {
            tenants = (yield queryInterface.sequelize.query('SELECT id FROM "Tenants"', {
                type: "SELECT"
            }));
        }
        catch (e) {
            console.warn("Table Tenants does not exist yet.");
            return;
        }
        // If no tenants, create the default one (Migration-first approach)
        if (tenants.length === 0) {
            const tenantId = process.env.DEFAULT_TENANT_UUID || "550e8400-e29b-41d4-a716-446655440000";
            const now = new Date();
            try {
                yield queryInterface.bulkInsert("Tenants", [{
                        id: tenantId,
                        name: "Default Tenant",
                        status: "active",
                        createdAt: now,
                        updatedAt: now
                    }]);
                tenants.push({ id: tenantId });
            }
            catch (error) {
                console.error("Error ensuring default tenant in helpdesk seed:", error);
                // Try to fetch again in case of race condition
                tenants = (yield queryInterface.sequelize.query('SELECT id FROM "Tenants"', {
                    type: "SELECT"
                }));
            }
        }
        const defaultCategories = JSON.stringify([
            "Incidente",
            "Requisição de Serviço",
            "Problema",
            "Mudança"
        ]);
        const defaultSla = JSON.stringify({
            low: 24,
            medium: 12,
            high: 4,
            urgent: 1
        });
        const settingsToInsert = [];
        if (tenants.length > 0) {
            for (const tenant of tenants) {
                const tenantId = tenant.id;
                const now = new Date();
                settingsToInsert.push({ key: "helpdesk_settings_enabled", value: "false", createdAt: now, updatedAt: now, tenantId }, { key: "helpdesk_categories", value: defaultCategories, createdAt: now, updatedAt: now, tenantId }, { key: "helpdesk_sla_config", value: defaultSla, createdAt: now, updatedAt: now, tenantId });
            }
            if (settingsToInsert.length > 0) {
                // Use bulkInsert with ignoreDuplicates to avoid errors if they already exist
                yield queryInterface.bulkInsert("Settings", settingsToInsert, {
                    ignoreDuplicates: true
                });
            }
        }
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // Optional: Delete these settings
        yield queryInterface.bulkDelete("Settings", {
            key: ["helpdesk_settings_enabled", "helpdesk_categories", "helpdesk_sla_config"]
        });
    })
};
