"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("QuickAnswers", "mediaType", {
                type: sequelize_1.DataTypes.STRING,
                defaultValue: "text"
            }),
            queryInterface.addColumn("QuickAnswers", "dataJson", {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true
            })
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("QuickAnswers", "mediaType"),
            queryInterface.removeColumn("QuickAnswers", "dataJson")
        ]);
    }
};
