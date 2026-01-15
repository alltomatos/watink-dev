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
            // Contacts
            { name: "create_contacts", description: "Criar/Importar Contatos" },
            { name: "edit_contacts", description: "Editar Contatos" },
            { name: "delete_contacts", description: "Excluir Contatos" },
            // Tickets
            { name: "delete_tickets", description: "Excluir Tickets" },
            // Quick Answers
            { name: "view_quick_answers", description: "Visualizar Respostas Rápidas" },
            { name: "manage_quick_answers", description: "Gerenciar Respostas Rápidas" },
            // Flows
            { name: "view_flows", description: "Visualizar Fluxos (Flow Builder)" },
            { name: "manage_flows", description: "Gerenciar Fluxos (Flow Builder)" },
            // Knowledge Bases
            { name: "view_knowledge_bases", description: "Visualizar Bases de Conhecimento" },
            { name: "manage_knowledge_bases", description: "Gerenciar Bases de Conhecimento" },
            // Connections (WhatsApp)
            { name: "view_connections", description: "Visualizar Conexões" },
            { name: "manage_connections", description: "Gerenciar Conexões" }
        ];
        const now = new Date();
        yield queryInterface.bulkInsert("Permissions", permissions.map((p) => (Object.assign(Object.assign({}, p), { createdAt: now, updatedAt: now }))), { ignoreDuplicates: true });
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // In strict production we might not want to delete these blindly, 
        // but for reversibility in this task:
        const permissionNames = [
            "create_contacts", "edit_contacts", "delete_contacts",
            "delete_tickets",
            "view_quick_answers", "manage_quick_answers",
            "view_flows", "manage_flows",
            "view_knowledge_bases", "manage_knowledge_bases",
            "view_connections", "manage_connections"
        ];
        yield queryInterface.bulkDelete("Permissions", {
            name: permissionNames
        });
    }),
};
