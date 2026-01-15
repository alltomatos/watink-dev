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
            { name: "view_pipelines", description: "Visualizar menu de Pipelines" },
            { name: "view_chats", description: "Visualizar menu de Chats/Tickets" },
            { name: "view_admin", description: "Visualizar menu de Administração" },
            { name: "view_admin_queues", description: "Gerenciar Filas (Admin)" },
            { name: "view_admin_settings", description: "Gerenciar Configurações (Admin)" },
            { name: "ticket_view_groups", description: "Visualizar Tickets de Grupos" },
            { name: "view_groups", description: "Gerenciar Grupos de Usuários" },
            { name: "view_users", description: "Gerenciar Usuários" }
        ];
        const now = new Date();
        yield queryInterface.bulkInsert("Permissions", permissions.map(p => (Object.assign(Object.assign({}, p), { createdAt: now, updatedAt: now }))), { ignoreDuplicates: true });
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.bulkDelete("Permissions", {});
    })
};
