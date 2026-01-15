"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        const existing = yield queryInterface.sequelize.query(`SELECT * FROM "Users" WHERE email = 'admin@admin.com'`);
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
    }),
    down: (queryInterface) => {
        return queryInterface.bulkDelete("Users", {});
    }
};
