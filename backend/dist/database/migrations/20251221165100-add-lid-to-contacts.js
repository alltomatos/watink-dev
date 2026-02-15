"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn("Contacts", "lid", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
            unique: true
        });
        await queryInterface.changeColumn("Contacts", "number", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
            unique: true // Postgres allows multiple NULLs in unique columns
        });
        // Remover o default value vazio se existir, para não conflitar
        await queryInterface.sequelize.query('ALTER TABLE "Contacts" ALTER COLUMN "number" DROP DEFAULT;');
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn("Contacts", "lid");
        // Reverter number para non-null pode falhar se houver LIDs criados.
        // Vamos apenas tentar reverter a flag se nao houver nulos, ou deixar como está (geralmente down é destrutivo/monitorado)
        // Para segurança, não forçamos allowNull: false no down sem garantir dados.
        // Mas para fins de reversão exata:
        await queryInterface.changeColumn("Contacts", "number", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
            unique: true
        });
    }
};
