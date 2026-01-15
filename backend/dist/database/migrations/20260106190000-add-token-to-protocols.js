"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("Protocols", "token", {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
            defaultValue: sequelize_1.DataTypes.UUIDV4 // This will backfill existing rows
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn("Protocols", "token");
    }
};
