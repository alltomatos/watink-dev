"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.createTable("Pipelines", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            },
            type: {
                type: sequelize_1.DataTypes.STRING, // 'kanban', 'funnel'
                allowNull: false,
                defaultValue: 'kanban'
            },
            color: {
                type: sequelize_1.DataTypes.STRING,
                defaultValue: '#3B82F6'
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
        await queryInterface.createTable("PipelineStages", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            color: {
                type: sequelize_1.DataTypes.STRING,
                defaultValue: '#E2E8F0'
            },
            order: {
                type: sequelize_1.DataTypes.INTEGER,
                defaultValue: 0
            },
            pipelineId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Pipelines", key: "id" },
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
    down: async (queryInterface) => {
        await queryInterface.dropTable("PipelineStages");
        await queryInterface.dropTable("Pipelines");
    }
};
