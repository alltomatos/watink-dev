"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Whatsapps", "syncHistory", {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: true
            }),
            queryInterface.addColumn("Whatsapps", "syncPeriod", {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            })
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("Whatsapps", "syncHistory"),
            queryInterface.removeColumn("Whatsapps", "syncPeriod")
        ]);
    }
};
