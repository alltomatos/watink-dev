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
const uuid_1 = require("uuid");
module.exports = {
    up: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        const existing = yield queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'userApiToken'`);
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
    }),
    down: (queryInterface) => {
        return queryInterface.bulkDelete("Settings", {});
    }
};
