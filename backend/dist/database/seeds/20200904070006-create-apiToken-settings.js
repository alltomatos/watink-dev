"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
module.exports = {
    up: async (queryInterface) => {
        const existing = await queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'userApiToken'`);
        if (existing[0].length === 0) {
            return queryInterface.bulkInsert("Settings", [
                {
                    key: "userApiToken",
                    value: (0, uuid_1.v4)(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
    },
    down: (queryInterface) => {
        return queryInterface.bulkDelete("Settings", {});
    }
};
