"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.createTable("Users", {
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
            email: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            passwordHash: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false
            },
            tokenVersion: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            configs: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: {
                    dashboard: {
                        widgets: [
                            { id: "tickets_info", visible: true, width: 4, order: 1 },
                            { id: "attendance_chart", visible: true, width: 8, order: 2 },
                        ]
                    }
                }
            },
            socialName: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            },
            profileImage: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            },
            lastAssignmentAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: null
            },
            enabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            emailVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            verificationToken: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            },
            passwordResetToken: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            },
            passwordResetExpires: {
                type: sequelize_1.DataTypes.DATE,
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
    },
    down: (queryInterface) => {
        return queryInterface.dropTable("Users");
    }
};
