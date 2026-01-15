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
        yield queryInterface.createTable("UserGroups", {
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
            groupId: {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Groups", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
                allowNull: false
            },
            tenantId: {
                type: sequelize_1.DataTypes.UUID,
                references: { model: "Tenants", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
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
        // Remove foreign key constraint first if it exists, then the column
        // Note: Constraint name usually follows tableName_columnName_fkey pattern or similar.
        // We try to remove the column directly; if it has a named constraint, it might fail in some DBs without removing constraint first.
        // PostgreSQL usually requires dropping the constraint. 
        // Let's assume standard Sequelize naming or just try removing column which might cascade or fail.
        // Safer to just remove column.
        // Check if column exists before trying to remove (Good practice for idempotency)
        const tableInfo = yield queryInterface.describeTable("Users");
        if (tableInfo["groupId"]) {
            yield queryInterface.removeColumn("Users", "groupId");
        }
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.dropTable("UserGroups");
        yield queryInterface.addColumn("Users", "groupId", {
            type: sequelize_1.DataTypes.INTEGER,
            references: { model: "Groups", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
        });
    })
};
