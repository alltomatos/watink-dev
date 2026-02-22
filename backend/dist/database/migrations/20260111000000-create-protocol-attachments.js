"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.createTable("ProtocolAttachments", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            protocolId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Protocols", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            tenantId: {
                type: sequelize_1.DataTypes.UUID,
                references: { model: "Tenants", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            fileName: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false
            },
            originalName: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false
            },
            filePath: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: false
            },
            fileType: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false
            },
            fileSize: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false
            },
            uploadedBy: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL",
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
        // Index para busca rápida por protocolo
        await queryInterface.addIndex("ProtocolAttachments", ["protocolId"]);
        await queryInterface.addIndex("ProtocolAttachments", ["tenantId"]);
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable("ProtocolAttachments");
    }
};
