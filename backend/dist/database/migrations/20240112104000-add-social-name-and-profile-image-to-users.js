"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Users", "socialName", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            }),
            queryInterface.addColumn("Users", "profileImage", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true
            })
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("Users", "socialName"),
            queryInterface.removeColumn("Users", "profileImage")
        ]);
    }
};
