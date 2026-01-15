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
        const permissions = [
            // Permissions for Clients Plugin
            {
                name: "view_clients",
                description: "Visualizar Clientes",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: "edit_clients",
                description: "Editar Clientes",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: "delete_clients",
                description: "Deletar Clientes",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            // Permissions for Helpdesk Plugin
            {
                name: "view_helpdesk",
                description: "Visualizar Helpdesk",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: "edit_helpdesk",
                description: "Editar Helpdesk",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: "view_protocols",
                description: "Visualizar Protocolos",
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        // Use bulkInsert with ignoreDuplicates option (specific syntax depends on dialect, but for Postgres usually handled via ON CONFLICT DO NOTHING or manual check)
        // Sequelize bulkInsert doesn't natively support ignoreDuplicates across all dialects perfectly in older versions, 
        // but for Postgres we can use the following approach or just a raw query if needed.
        // However, simplest standar way:
        return queryInterface.bulkInsert("Permissions", permissions, { ignoreDuplicates: true });
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        return queryInterface.bulkDelete("Permissions", {
            name: [
                "view_clients",
                "edit_clients",
                "delete_clients",
                "view_helpdesk",
                "edit_helpdesk",
                "view_protocols"
            ]
        }, {});
    })
};
