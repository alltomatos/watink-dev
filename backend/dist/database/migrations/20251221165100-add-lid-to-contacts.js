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
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.addColumn("Contacts", "lid", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
            unique: true
        });
        yield queryInterface.changeColumn("Contacts", "number", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
            unique: true // Postgres allows multiple NULLs in unique columns
        });
        // Remover o default value vazio se existir, para não conflitar
        yield queryInterface.sequelize.query('ALTER TABLE "Contacts" ALTER COLUMN "number" DROP DEFAULT;');
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.removeColumn("Contacts", "lid");
        // Reverter number para non-null pode falhar se houver LIDs criados.
        // Vamos apenas tentar reverter a flag se nao houver nulos, ou deixar como está (geralmente down é destrutivo/monitorado)
        // Para segurança, não forçamos allowNull: false no down sem garantir dados.
        // Mas para fins de reversão exata:
        yield queryInterface.changeColumn("Contacts", "number", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
            unique: true
        });
    })
};
