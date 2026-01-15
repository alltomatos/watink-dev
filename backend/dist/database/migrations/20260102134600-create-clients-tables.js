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
        // Create Clients table
        yield queryInterface.createTable("Clients", {
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
            type: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "pf" // pf = pessoa física, pj = pessoa jurídica
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false
            },
            document: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true // CPF ou CNPJ
            },
            email: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true
            },
            phone: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
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
        // Create ClientContacts table (multiple contacts per client)
        yield queryInterface.createTable("ClientContacts", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            clientId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Clients", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            contactId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                references: { model: "Contacts", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false
            },
            role: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true // Cargo/função
            },
            phone: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true
            },
            email: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true
            },
            isPrimary: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
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
        // Create ClientAddresses table (multiple addresses per client)
        yield queryInterface.createTable("ClientAddresses", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            clientId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: { model: "Clients", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            label: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true // ex: "Sede", "Filial", "Residência"
            },
            zipCode: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: true
            },
            street: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true
            },
            number: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: true
            },
            complement: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true
            },
            neighborhood: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true
            },
            city: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true
            },
            state: {
                type: sequelize_1.DataTypes.STRING(2),
                allowNull: true
            },
            isPrimary: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
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
        // Add indexes
        yield queryInterface.addIndex("Clients", ["tenantId"]);
        yield queryInterface.addIndex("Clients", ["document"]);
        yield queryInterface.addIndex("ClientContacts", ["clientId"]);
        yield queryInterface.addIndex("ClientContacts", ["contactId"]);
        yield queryInterface.addIndex("ClientAddresses", ["clientId"]);
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.dropTable("ClientAddresses");
        yield queryInterface.dropTable("ClientContacts");
        yield queryInterface.dropTable("Clients");
    })
};
