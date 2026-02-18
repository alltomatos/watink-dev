"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = exports.up = void 0;
const up = async (queryInterface) => {
    // Use QueryTypes.SELECT to ensure we get just the results array
    const tenants = await queryInterface.sequelize.query("SELECT id FROM \"Tenants\";", {
        type: queryInterface.sequelize.QueryTypes.SELECT
    });
    const tenantList = Array.isArray(tenants) && Array.isArray(tenants[0])
        ? tenants[0]
        : tenants;
    for (const tenant of tenantList) {
        // If tenant is metadata or malformed, skip
        if (!tenant || !tenant.id)
            continue;
        const tenantId = tenant.id;
        // Check if timezone setting exists for this tenant
        const timezoneSetting = await queryInterface.rawSelect("Settings", {
            where: {
                key: "timezone",
                tenantId: tenantId
            }
        }, ["key"]);
        if (!timezoneSetting) {
            await queryInterface.bulkInsert("Settings", [
                {
                    key: "timezone",
                    value: "-03:00",
                    tenantId: tenantId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]);
        }
    }
};
exports.up = up;
const down = async (queryInterface) => {
    await queryInterface.bulkDelete("Settings", { key: "timezone" });
};
exports.down = down;
