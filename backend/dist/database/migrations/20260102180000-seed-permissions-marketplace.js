"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: async (queryInterface) => {
        const now = new Date();
        const permissions = [
            {
                name: "view_marketplace",
                description: "Visualizar Marketplace",
                createdAt: now,
                updatedAt: now
            },
            {
                name: "edit_marketplace",
                description: "Editar Marketplace",
                createdAt: now,
                updatedAt: now
            }
        ];
        return queryInterface.bulkInsert("Permissions", permissions, { ignoreDuplicates: true });
    },
    down: async (queryInterface) => {
        return queryInterface.bulkDelete("Permissions", { name: ["view_marketplace", "edit_marketplace"] }, {});
    }
};
