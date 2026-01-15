"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
            .then(() => {
            return queryInterface.createTable('Tenants', {
                id: {
                    type: sequelize_1.DataTypes.UUID,
                    defaultValue: sequelize_1.DataTypes.UUIDV4,
                    primaryKey: true,
                    allowNull: false
                },
                name: {
                    type: sequelize_1.DataTypes.STRING,
                    allowNull: false
                },
                status: {
                    type: sequelize_1.DataTypes.STRING,
                    defaultValue: 'active',
                    allowNull: false
                },
                ownerId: {
                    type: sequelize_1.DataTypes.INTEGER,
                    allowNull: true,
                    references: { model: 'Users', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
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
        });
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('Tenants');
    }
};
