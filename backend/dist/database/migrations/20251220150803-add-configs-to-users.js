"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("Users", "configs", {
            type: sequelize_1.DataTypes.JSON,
            allowNull: true,
            defaultValue: {
                dashboard: {
                    widgets: [
                        { id: "tickets_info", visible: true, width: 4, order: 1 },
                        { id: "attendance_chart", visible: true, width: 8, order: 2 },
                    ]
                }
            }
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn("Users", "configs");
    }
};
