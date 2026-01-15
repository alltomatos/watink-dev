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
        // 1. Find admin user
        const users = yield queryInterface.sequelize.query(`SELECT id, "tenantId" FROM "Users" WHERE email = 'admin@admin.com' LIMIT 1;`);
        if (users[0].length === 0) {
            console.log("User admin@admin.com not found. Skipping Admin Group seed.");
            return;
        }
        const user = users[0][0];
        let tenantId = user.tenantId;
        // 2. If user has no tenant, try to find default tenant
        if (!tenantId) {
            const tenants = yield queryInterface.sequelize.query(`SELECT id FROM "Tenants" LIMIT 1;`);
            if (tenants[0].length > 0) {
                tenantId = tenants[0][0].id;
            }
        }
        if (!tenantId) {
            console.log("No tenant found. Skipping Admin Group seed.");
            return;
        }
        // 3. Find or Create Admin Group
        let groupId;
        const groups = yield queryInterface.sequelize.query(`SELECT id FROM "Groups" WHERE name = 'Admin' AND "tenantId" = '${tenantId}' LIMIT 1;`);
        if (groups[0].length > 0) {
            groupId = groups[0][0].id;
        }
        else {
            const now = new Date();
            yield queryInterface.bulkInsert("Groups", [{
                    name: "Admin",
                    tenantId: tenantId,
                    createdAt: now,
                    updatedAt: now
                }]);
            // Fetch the created group ID
            const newGroups = yield queryInterface.sequelize.query(`SELECT id FROM "Groups" WHERE name = 'Admin' AND "tenantId" = '${tenantId}' LIMIT 1;`);
            groupId = newGroups[0][0].id;
        }
        // 4. Update User to belong to this Group
        // 4. Update User to belong to this Group
        const existingLinks = yield queryInterface.sequelize.query(`SELECT id FROM "UserGroups" WHERE "userId" = ${user.id} AND "groupId" = ${groupId} LIMIT 1;`);
        if (existingLinks[0].length === 0) {
            yield queryInterface.bulkInsert("UserGroups", [{
                    userId: user.id,
                    groupId: groupId,
                    tenantId: tenantId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }]);
        }
        // 5. Get All Permissions
        const permissions = yield queryInterface.sequelize.query(`SELECT id FROM "Permissions"`);
        const allPermissions = permissions[0];
        // 6. Associate All Permissions to the Group
        // We can just bulk insert and ignore duplicates if possible, or check what's missing.
        // Simpler approach for seed: Fetch existing group permissions and filter.
        const existingGroupPermissions = yield queryInterface.sequelize.query(`SELECT "permissionId" FROM "GroupPermissions" WHERE "groupId" = ${groupId}`);
        const existingPermIds = existingGroupPermissions[0].map(p => p.permissionId);
        const newGroupPermissions = allPermissions
            .filter(p => !existingPermIds.includes(p.id))
            .map(p => ({
            groupId: groupId,
            permissionId: p.id,
            tenantId: tenantId,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        if (newGroupPermissions.length > 0) {
            yield queryInterface.bulkInsert("GroupPermissions", newGroupPermissions);
        }
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // Reverting this is tricky without affecting manual changes. 
        // Generally seeds don't need strict down logic if they are just data population.
    })
};
