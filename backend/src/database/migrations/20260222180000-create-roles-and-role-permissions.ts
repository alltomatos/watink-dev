import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        // Create Roles table
        await queryInterface.createTable("Roles", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true
            },
            isSystem: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: "Tenants", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        });

        // Create RolePermissions table
        await queryInterface.createTable("RolePermissions", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            roleId: {
                type: DataTypes.INTEGER,
                references: { model: "Roles", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            permissionId: {
                type: DataTypes.INTEGER,
                references: { model: "Permissions", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            scope: {
                type: DataTypes.JSONB,
                allowNull: true
            },
            conditions: {
                type: DataTypes.JSONB,
                allowNull: true
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: "Tenants", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        });

        // Create UserRoles join table
        await queryInterface.createTable("UserRoles", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            userId: {
                type: DataTypes.INTEGER,
                references: { model: "Users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            roleId: {
                type: DataTypes.INTEGER,
                references: { model: "Roles", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false
            }
        });

        // Add indices
        await queryInterface.addIndex("RolePermissions", ["roleId"]);
        await queryInterface.addIndex("RolePermissions", ["permissionId"]);
        await queryInterface.addIndex("UserRoles", ["userId"]);
        await queryInterface.addIndex("UserRoles", ["roleId"]);
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.dropTable("UserRoles");
        await queryInterface.dropTable("RolePermissions");
        await queryInterface.dropTable("Roles");
    }
};
