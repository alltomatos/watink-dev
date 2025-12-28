import { QueryInterface } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const now = new Date();
        const permissions = [
            {
                name: "view_dashboard",
                description: "Visualizar Dashboard",
                createdAt: now,
                updatedAt: now,
            },
            {
                name: "view_pipelines",
                description: "Visualizar Pipelines",
                createdAt: now,
                updatedAt: now,
            },
            {
                name: "view_swagger",
                description: "Visualizar Swagger",
                createdAt: now,
                updatedAt: now,
            }
        ];

        const newPermissions = [];

        for (const p of permissions) {
            const [exists] = await queryInterface.sequelize.query(
                `SELECT id FROM "Permissions" WHERE name = '${p.name}';`
            );
            if (!exists || exists.length === 0) {
                newPermissions.push(p);
            }
        }

        if (newPermissions.length > 0) {
            await queryInterface.bulkInsert("Permissions", newPermissions);
        }

        // Assign to Admin Group (ID 1)
        const [viewDashboard] = await queryInterface.sequelize.query(
            `SELECT id FROM "Permissions" WHERE name = 'view_dashboard';`
        );
        const [viewPipelines] = await queryInterface.sequelize.query(
            `SELECT id FROM "Permissions" WHERE name = 'view_pipelines';`
        );
        const [viewSwagger] = await queryInterface.sequelize.query(
            `SELECT id FROM "Permissions" WHERE name = 'view_swagger';`
        );

        // Fetch default tenant
        const [tenant] = await queryInterface.sequelize.query(
            `SELECT id FROM "Tenants" LIMIT 1;`
        );

        if (!tenant || !tenant[0]) {
            console.error("No tenant found. Skipping GroupPermission assignment.");
            return;
        }

        const defaultTenantId = (tenant[0] as any).id;
        const adminGroupId = 1;
        const groupPermissions = [];

        if (viewDashboard[0]) {
            groupPermissions.push({
                groupId: adminGroupId,
                permissionId: (viewDashboard[0] as any).id,
                tenantId: defaultTenantId,
                createdAt: now,
                updatedAt: now,
            });
        }
        if (viewPipelines[0]) {
            groupPermissions.push({
                groupId: adminGroupId,
                permissionId: (viewPipelines[0] as any).id,
                tenantId: defaultTenantId,
                createdAt: now,
                updatedAt: now,
            });
        }
        if (viewSwagger[0]) {
            groupPermissions.push({
                groupId: adminGroupId,
                permissionId: (viewSwagger[0] as any).id,
                tenantId: defaultTenantId,
                createdAt: now,
                updatedAt: now,
            });
        }

        if (groupPermissions.length > 0) {
            await queryInterface.bulkInsert("GroupPermissions", groupPermissions);
        }
    },

    down: async (queryInterface: QueryInterface) => {
        const permissions = [
            "view_dashboard",
            "view_pipelines",
            "view_swagger"
        ];
        await queryInterface.bulkDelete("Permissions", { name: permissions });
    },
};
