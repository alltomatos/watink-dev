"use strict";

import { QueryInterface } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // Inserir permissões seguindo padrão RBAC Enterprise (resource:action)
        await queryInterface.bulkInsert("Permissions", [
            // Activity Templates (Configuração)
            {
                name: "activity-template:read",
                description: "Visualizar templates de atividades",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: "activity-template:write",
                description: "Criar/editar templates de atividades",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: "activity-template:delete",
                description: "Excluir templates de atividades",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            // Activities (Execução)
            {
                name: "activity:read",
                description: "Visualizar atividades e RAT",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: "activity:write",
                description: "Criar/editar atividades e checklist",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: "activity:finalize",
                description: "Finalizar atividade e gerar RAT",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: "activity:delete",
                description: "Excluir atividades",
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        // Adicionar permissões ao Role "Admin" automaticamente
        await queryInterface.sequelize.query(`
            INSERT INTO "RolePermissions" ("roleId", "permissionId", "createdAt", "updatedAt")
            SELECT r.id, p.id, NOW(), NOW()
            FROM "Roles" r, "Permissions" p
            WHERE r.name = 'Admin' AND p.name LIKE 'activity%'
            ON CONFLICT DO NOTHING;
        `);
    },

    down: async (queryInterface: QueryInterface) => {
        // Remover permissões do RolePermissions
        await queryInterface.sequelize.query(`
            DELETE FROM "RolePermissions"
            WHERE "permissionId" IN (
                SELECT id FROM "Permissions" WHERE name LIKE 'activity%'
            );
        `);

        // Remover permissões
        await queryInterface.bulkDelete("Permissions", {
            name: [
                "activity-template:read",
                "activity-template:write",
                "activity-template:delete",
                "activity:read",
                "activity:write",
                "activity:finalize",
                "activity:delete"
            ]
        });
    }
};
