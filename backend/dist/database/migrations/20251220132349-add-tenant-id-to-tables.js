"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
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
        return Promise.all(tables.map(table => {
            return queryInterface.addColumn(table, 'tenantId', {
                type: sequelize_1.DataTypes.UUID,
                references: { model: 'Tenants', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                allowNull: true // Initially nullable to allow migration of existing data
            }).then(() => {
                return queryInterface.addIndex(table, ['tenantId']);
            });
        }));
    },
    down: (queryInterface) => {
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
        return Promise.all(tables.map(table => {
            return queryInterface.removeColumn(table, 'tenantId');
        }));
    }
};
