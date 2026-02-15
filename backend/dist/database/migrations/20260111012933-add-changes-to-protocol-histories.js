"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        return queryInterface.addColumn("ProtocolHistories", "changes", {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        });
    },
    down: async (queryInterface) => {
        return queryInterface.removeColumn("ProtocolHistories", "changes");
    },
};
