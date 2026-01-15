"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Whatsapps", "type", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                defaultValue: "whatsapp",
            }),
            queryInterface.addColumn("Whatsapps", "chatConfig", {
                type: sequelize_1.DataTypes.JSONB,
                allowNull: true,
            }),
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("Whatsapps", "type"),
            queryInterface.removeColumn("Whatsapps", "chatConfig"),
        ]);
    },
};
