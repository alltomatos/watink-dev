"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: async (queryInterface) => {
        // Check if systemTitle exists
        const titleExists = await queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'systemTitle'`);
        if (titleExists[0].length === 0) {
            await queryInterface.bulkInsert("Settings", [
                {
                    key: "systemTitle",
                    value: "Watink",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
        // Check if systemLogo exists
        const logoExists = await queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'systemLogo'`);
        if (logoExists[0].length === 0) {
            await queryInterface.bulkInsert("Settings", [
                {
                    key: "systemLogo",
                    value: "",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
        // Check if systemLogoEnabled exists
        const logoEnabledExists = await queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'systemLogoEnabled'`);
        if (logoEnabledExists[0].length === 0) {
            await queryInterface.bulkInsert("Settings", [
                {
                    key: "systemLogoEnabled",
                    value: "true",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
        // Check if systemFavicon exists
        const faviconExists = await queryInterface.sequelize.query(`SELECT * FROM "Settings" WHERE key = 'systemFavicon'`);
        if (faviconExists[0].length === 0) {
            await queryInterface.bulkInsert("Settings", [
                {
                    key: "systemFavicon",
                    value: "",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ], {});
        }
    },
    down: async (queryInterface) => {
        await queryInterface.bulkDelete("Settings", { key: "systemTitle" });
        await queryInterface.bulkDelete("Settings", { key: "systemLogo" });
        await queryInterface.bulkDelete("Settings", { key: "systemLogoEnabled" });
        await queryInterface.bulkDelete("Settings", { key: "systemFavicon" });
    }
};
