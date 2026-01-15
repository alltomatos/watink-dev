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
        const tables = [
            'Users',
            'Contacts',
            'Tickets',
            'Messages',
            'Whatsapps',
            'Queues',
            'QuickAnswers',
            'Settings'
        ];
        // Enable RLS for each table
        for (const table of tables) {
            yield queryInterface.sequelize.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
            // Create Policy: Tenant Isolation
            // Users can only see rows where tenantId matches their session's current_tenant
            yield queryInterface.sequelize.query(`
        CREATE POLICY "${table}_tenant_isolation" ON "${table}"
        USING ("tenantId" = current_setting('app.current_tenant', true)::uuid);
      `);
        }
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        const tables = [
            'Users',
            'Contacts',
            'Tickets',
            'Messages',
            'Whatsapps',
            'Queues',
            'QuickAnswers',
            'Settings'
        ];
        for (const table of tables) {
            yield queryInterface.sequelize.query(`DROP POLICY IF EXISTS "${table}_tenant_isolation" ON "${table}";`);
            yield queryInterface.sequelize.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
        }
    })
};
