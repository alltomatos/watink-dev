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
        // 1. Find the admin user
        const users = yield queryInterface.sequelize.query(`SELECT id, "tenantId" FROM "Users" WHERE email = 'admin@admin.com' LIMIT 1;`);
        if (users[0].length === 0) {
            console.log("User admin@admin.com not found. Skipping Ensure Super Admin Permissions seed.");
            return;
        }
        const user = users[0][0];
        const tenantId = user.tenantId;
        if (!tenantId) {
            console.log("User admin@admin.com has no tenantId. Skipping.");
            return;
        }
        // 2. Fetch all permissions
        const permissions = yield queryInterface.sequelize.query(`SELECT id FROM "Permissions";`);
        const allPermissions = permissions[0];
        if (allPermissions.length === 0) {
            console.log("No permissions found to assign.");
            return;
        }
        // 3. Fetch existing user permissions to avoid duplicates
        const existingUserPermissions = yield queryInterface.sequelize.query(`SELECT "permissionId" FROM "UserPermissions" WHERE "userId" = ${user.id}`);
        const existingPermIds = existingUserPermissions[0].map(p => p.permissionId);
        // 4. Filter out permissions the user already has
        const newPermissions = allPermissions
            .filter(p => !existingPermIds.includes(p.id))
            .map(p => ({
            userId: user.id,
            permissionId: p.id,
            tenantId: tenantId,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        if (newPermissions.length > 0) {
            yield queryInterface.bulkInsert("UserPermissions", newPermissions);
            console.log(`Assigned ${newPermissions.length} new permissions to admin@admin.com`);
        }
        else {
            console.log("admin@admin.com already has all permissions.");
        }
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // Strictly speaking, we might not want to remove permissions on down
        // as they might have been manually assigned.
        // Keeping empty for safety.
    })
};
