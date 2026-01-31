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
        const passwordHash = "$2a$08$DyqWApJJvtEaonPwbHEzS.lfiJFkh7qDZzzsgrDi8r9gyzBgIqD0O"; // devadmin
        const existing = yield queryInterface.sequelize.query(`SELECT * FROM "Users" WHERE email = 'admin@admin.com'`);
        if (existing[0].length === 0) {
            return queryInterface.bulkInsert("Users", [
                {
                    name: "Super Admin",
                    email: "admin@admin.com",
                    passwordHash,
                    tokenVersion: 0,
                    emailVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
        else {
            return queryInterface.sequelize.query(`UPDATE "Users" SET "emailVerified" = true, "passwordHash" = '${passwordHash}' WHERE email = 'admin@admin.com'`);
        }
    }),
    down: (queryInterface) => {
        return queryInterface.bulkDelete("Users", {});
    }
};
