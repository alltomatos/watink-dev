"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        // Create Clients table
        await queryInterface.createTable("Clients", {
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
        await queryInterface.createTable("ClientContacts", {
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
        await queryInterface.createTable("ClientAddresses", {
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
        await queryInterface.addIndex("Clients", ["tenantId"]);
        await queryInterface.addIndex("Clients", ["document"]);
        await queryInterface.addIndex("ClientContacts", ["clientId"]);
        await queryInterface.addIndex("ClientContacts", ["contactId"]);
        await queryInterface.addIndex("ClientAddresses", ["clientId"]);
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable("ClientAddresses");
        await queryInterface.dropTable("ClientContacts");
        await queryInterface.dropTable("Clients");
    }
};
