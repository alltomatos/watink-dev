"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: async (queryInterface) => {
        const existing = await queryInterface.sequelize.query(`SELECT * FROM "Users" WHERE email = 'admin@admin.com'`);
        if (existing[0].length === 0) {
            return queryInterface.bulkInsert("Users", [
                {
                    name: "Super Admin",
                    email: "admin@admin.com",
                    passwordHash: "$2a$08$3DhljWiasvNJHe4PZi0ODe5q1B1SbPAJg7NMhPk6T3H9RmK7gLlO6",
                    profile: "superadmin",
                    tokenVersion: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
    },
    down: (queryInterface) => {
        return queryInterface.bulkDelete("Users", {});
    }
};
