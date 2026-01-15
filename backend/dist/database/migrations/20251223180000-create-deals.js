"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.createTable("Deals", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            title: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            value: {
                type: sequelize_1.DataTypes.DECIMAL(10, 2),
                defaultValue: 0.00
            },
            priority: {
                type: sequelize_1.DataTypes.INTEGER, // 1: Low, 2: Medium, 3: High
                defaultValue: 1
            },
            contactId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Contacts", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            ticketId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Tickets", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
                allowNull: true
            },
            pipelineId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Pipelines", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            stageId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "PipelineStages", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
                allowNull: true
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
        return queryInterface.dropTable("Deals");
    }
};
