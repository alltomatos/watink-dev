"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        // Create Protocols table
        await queryInterface.createTable("Protocols", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            tenantId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: { model: "Tenants", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            protocolNumber: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false
            },
            ticketId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: { model: "Tickets", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            contactId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: { model: "Contacts", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            userId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            subject: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            },
            status: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "open" // open, in_progress, pending, resolved, closed
            },
            priority: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "medium" // low, medium, high, urgent
            },
            category: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true
            },
            dueDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true
            },
            resolvedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true
            },
            closedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW
            }
        });
        // Create ProtocolHistory table
        await queryInterface.createTable("ProtocolHistories", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            protocolId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Protocols", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            userId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            action: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false // created, status_changed, assigned, commented, resolved, closed
            },
            previousValue: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true
            },
            newValue: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true
            },
            comment: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW
            }
        });
        // Add indexes
        await queryInterface.addIndex("Protocols", ["tenantId"]);
        await queryInterface.addIndex("Protocols", ["protocolNumber"]);
        await queryInterface.addIndex("Protocols", ["ticketId"]);
        await queryInterface.addIndex("Protocols", ["contactId"]);
        await queryInterface.addIndex("Protocols", ["status"]);
        await queryInterface.addIndex("ProtocolHistories", ["protocolId"]);
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable("ProtocolHistories");
        await queryInterface.dropTable("Protocols");
    }
};
