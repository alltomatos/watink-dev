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
        // Create Protocols table
        yield queryInterface.createTable("Protocols", {
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
        yield queryInterface.createTable("ProtocolHistories", {
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
        yield queryInterface.addIndex("Protocols", ["tenantId"]);
        yield queryInterface.addIndex("Protocols", ["protocolNumber"]);
        yield queryInterface.addIndex("Protocols", ["ticketId"]);
        yield queryInterface.addIndex("Protocols", ["contactId"]);
        yield queryInterface.addIndex("Protocols", ["status"]);
        yield queryInterface.addIndex("ProtocolHistories", ["protocolId"]);
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.dropTable("ProtocolHistories");
        yield queryInterface.dropTable("Protocols");
    })
};
