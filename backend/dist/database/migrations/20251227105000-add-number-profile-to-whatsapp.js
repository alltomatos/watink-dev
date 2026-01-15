"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Whatsapps", "number", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            }),
            queryInterface.addColumn("Whatsapps", "profilePicUrl", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            })
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("Whatsapps", "number"),
            queryInterface.removeColumn("Whatsapps", "profilePicUrl")
        ]);
    }
};
