"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("Queues", "distributionMode", {
            type: sequelize_1.DataTypes.ENUM("manual", "round-robin"),
            allowNull: false,
            defaultValue: "manual",
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn("Queues", "distributionMode");
    },
};
