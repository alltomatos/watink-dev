"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.createTable("FlowSessions", {
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
            currentStepId: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true // Null means flow finished or just started
            },
            status: {
                type: sequelize_1.DataTypes.STRING,
                defaultValue: "active", // active, completed, failed
                allowNull: false
            },
            context: {
                type: sequelize_1.DataTypes.JSONB,
                defaultValue: {}
            },
            entityId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true // Can be ticketId, dealId, etc.
            },
            entityType: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true // 'ticket', 'deal', 'contact'
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
        return queryInterface.dropTable("FlowSessions");
    }
};
