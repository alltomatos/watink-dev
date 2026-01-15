"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("Users", "whatsappId", {
            type: sequelize_1.DataTypes.INTEGER,
            references: { model: "Whatsapps", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
            allowNull: true
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn("Users", "whatsappId");
    }
};
