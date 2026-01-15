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
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.createTable("ProtocolAttachments", {
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
        yield queryInterface.addIndex("ProtocolAttachments", ["protocolId"]);
        yield queryInterface.addIndex("ProtocolAttachments", ["tenantId"]);
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.dropTable("ProtocolAttachments");
    })
};
