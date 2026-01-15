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
        // Check if systemTitle exists
        const titleExists = yield queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'systemTitle'`);
        if (titleExists[0].length === 0) {
            yield queryInterface.bulkInsert("Settings", [
                {
                    key: "systemTitle",
                    value: "Watink",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
        // Check if systemLogo exists
        const logoExists = yield queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'systemLogo'`);
        if (logoExists[0].length === 0) {
            yield queryInterface.bulkInsert("Settings", [
                {
                    key: "systemLogo",
                    value: "",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
        // Check if systemLogoEnabled exists
        const logoEnabledExists = yield queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'systemLogoEnabled'`);
        if (logoEnabledExists[0].length === 0) {
            yield queryInterface.bulkInsert("Settings", [
                {
                    key: "systemLogoEnabled",
                    value: "true",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
        // Check if systemFavicon exists
        const faviconExists = yield queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'systemFavicon'`);
        if (faviconExists[0].length === 0) {
            yield queryInterface.bulkInsert("Settings", [
                {
                    key: "systemFavicon",
                    value: "",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.bulkDelete("Settings", { key: "systemTitle" });
        yield queryInterface.bulkDelete("Settings", { key: "systemLogo" });
        yield queryInterface.bulkDelete("Settings", { key: "systemLogoEnabled" });
        yield queryInterface.bulkDelete("Settings", { key: "systemFavicon" });
    })
};
