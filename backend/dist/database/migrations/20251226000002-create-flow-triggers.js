"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.createTable("FlowTriggers", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            flowId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Flows", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            type: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false // 'whatsapp_message', 'ticket_create', 'kanban_move', 'manual'
            },
            condition: {
                type: sequelize_1.DataTypes.JSONB,
                defaultValue: {}
                // Example: { "queueId": 1, "keywords": ["help"] }
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: true
            },
            tenantId: {
                type: sequelize_1.DataTypes.UUID,
                references: { model: "Tenants", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false
            }
        });
    },
    down: (queryInterface) => {
        return queryInterface.dropTable("FlowTriggers");
    }
};
