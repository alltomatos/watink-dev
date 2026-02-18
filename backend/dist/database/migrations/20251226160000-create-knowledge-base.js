"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        // Enable pgvector extension
        await queryInterface.sequelize.query("CREATE EXTENSION IF NOT EXISTS vector;");
        // Table: KnowledgeBases
        await queryInterface.createTable("KnowledgeBases", {
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
        // Table: KnowledgeSources
        await queryInterface.createTable("KnowledgeSources", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            baseId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "KnowledgeBases", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            name: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("url", "pdf", "text"),
                allowNull: false,
                defaultValue: "text"
            },
            url: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            },
            content: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("pending", "processing", "indexed", "error"),
                defaultValue: "pending"
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
        // Table: KnowledgeVectors
        await queryInterface.createTable("KnowledgeVectors", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            sourceId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "KnowledgeSources", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            content: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false
            },
            vector: {
                type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.FLOAT),
                // Note: Raw SQL usually needed for proper vector type if sequelize-pgvector isn't strictly used,
                // but broadly we cast during insertion or use raw queries. 
                // For migration safety we define it as ARRAY(FLOAT) here, but ensuring it is treated as vector in DB might require raw SQL modification.
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
        // Manually alter column to be vector type if possible, or trust array logic
        // We execute a raw query to convert the column to actual vector type to be safe
        try {
            await queryInterface.sequelize.query(`ALTER TABLE "KnowledgeVectors" ALTER COLUMN vector TYPE vector(1536);`);
        }
        catch (e) {
            console.log("Vector extension might not be enabled or vector type issue", e);
        }
    },
    down: async (queryInterface) => {
        await queryInterface.dropTable("KnowledgeVectors");
        await queryInterface.dropTable("KnowledgeSources");
        await queryInterface.dropTable("KnowledgeBases");
    }
};
