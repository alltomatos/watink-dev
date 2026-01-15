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
const uuid_1 = require("uuid");
module.exports = {
    up: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Find the default tenant
        const tenants = yield queryInterface.sequelize.query(`SELECT id FROM "Tenants" LIMIT 1;`);
        if (!tenants || !tenants[0] || tenants[0].length === 0) {
            console.log("No tenant found. Skipping Clientes plugin installation seed.");
            return;
        }
        const tenantId = tenants[0][0].id;
        const clientsPluginId = "550e8400-e29b-41d4-a716-446655440001"; // ID from create-plugins-tables migration
        // 2. Check if already installed
        const existingInstallation = yield queryInterface.sequelize.query(`SELECT id FROM "PluginInstallations" WHERE "tenantId" = '${tenantId}' AND "pluginId" = '${clientsPluginId}';`);
        if (existingInstallation[0].length > 0) {
            console.log("Clientes plugin already installed for default tenant. Keeping current status.");
            // Do NOT force activation - respect user's choice
            return;
        }
        // 3. Install Clientes Plugin as INACTIVE by default
        yield queryInterface.bulkInsert("PluginInstallations", [
            {
                id: (0, uuid_1.v4)(),
                tenantId: tenantId,
                pluginId: clientsPluginId,
                status: "inactive", // Plugin comes disabled by default
                installedAt: new Date(),
                activatedAt: null
            }
        ]);
        console.log("Clientes plugin installed as INACTIVE for default tenant.");
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        const clientsPluginId = "550e8400-e29b-41d4-a716-446655440001";
        yield queryInterface.bulkDelete("PluginInstallations", {
            pluginId: clientsPluginId
        });
    })
};
