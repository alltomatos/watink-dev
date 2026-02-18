"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.createTable("Groups", {
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
            tenantId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: { model: "Tenants", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
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
        await queryInterface.createTable("Permissions", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            description: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
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
        await queryInterface.createTable("GroupPermissions", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            groupId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Groups", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            permissionId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Permissions", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            tenantId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: { model: "Tenants", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
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
        await queryInterface.addColumn("Users", "groupId", {
            type: sequelize_1.DataTypes.INTEGER,
            references: { model: "Groups", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
            allowNull: true
        });
        await queryInterface.createTable("UserPermissions", {
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            userId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            permissionId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Permissions", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            tenantId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                references: { model: "Tenants", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
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
        await queryInterface.dropTable("UserPermissions");
        await queryInterface.removeColumn("Users", "groupId");
        await queryInterface.dropTable("GroupPermissions");
        await queryInterface.dropTable("Permissions");
        await queryInterface.dropTable("Groups");
    }
};
