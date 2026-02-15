"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
module.exports = {
    up: async (queryInterface) => {
        // 1. Find the default tenant
        const tenants = await queryInterface.sequelize.query(`SELECT id FROM "Tenants" LIMIT 1;`);
        if (!tenants || !tenants[0] || tenants[0].length === 0) {
            console.log("No tenant found. Skipping Helpdesk plugin installation seed.");
            return;
        }
        const tenantId = tenants[0][0].id;
        const helpdeskPluginId = "550e8400-e29b-41d4-a716-446655440002"; // ID from create-plugins-tables migration
        // 2. Check if already installed
        const existingInstallation = await queryInterface.sequelize.query(`SELECT id FROM "PluginInstallations" WHERE "tenantId" = '${tenantId}' AND "pluginId" = '${helpdeskPluginId}';`);
        if (existingInstallation[0].length > 0) {
            console.log("Helpdesk plugin already installed for default tenant. Keeping current status.");
            // Do NOT force activation - respect user's choice
            return;
        }
        // 3. Install Helpdesk Plugin as INACTIVE by default
        await queryInterface.bulkInsert("PluginInstallations", [
            {
                id: (0, uuid_1.v4)(),
                tenantId: tenantId,
                pluginId: helpdeskPluginId,
                status: "inactive", // Plugin comes disabled by default
                installedAt: new Date(),
                activatedAt: null
            }
        ]);
        console.log("Helpdesk plugin installed as INACTIVE for default tenant.");
    },
    down: async (queryInterface) => {
        const helpdeskPluginId = "550e8400-e29b-41d4-a716-446655440002";
        await queryInterface.bulkDelete("PluginInstallations", {
            pluginId: helpdeskPluginId
        });
    }
};
