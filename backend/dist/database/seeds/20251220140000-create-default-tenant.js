"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
module.exports = {
    up: async (queryInterface) => {
        const tenants = await queryInterface.sequelize.query(`SELECT id FROM "Tenants" LIMIT 1;`);
        let tenantId;
        if (tenants[0].length === 0) {
            tenantId = process.env.DEFAULT_TENANT_UUID || (0, uuid_1.v4)();
            await queryInterface.bulkInsert("Tenants", [
                {
                    id: tenantId,
                    name: "Default Tenant",
                    status: "active",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]);
        }
        else {
            tenantId = tenants[0][0].id;
        }
        // Update existing users to belong to this tenant
        await queryInterface.sequelize.query(`UPDATE "Users" SET "tenantId" = '${tenantId}' WHERE "tenantId" IS NULL;`);
    },
    down: async (queryInterface) => {
        // We don't want to delete the tenant on down if it has data, but for completeness:
        // await queryInterface.bulkDelete("Tenants", {});
    }
};
