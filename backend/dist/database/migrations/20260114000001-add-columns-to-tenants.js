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
        yield queryInterface.addColumn("Tenants", "logo", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true
        });
        yield queryInterface.addColumn("Tenants", "document", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true
        });
        yield queryInterface.addColumn("Tenants", "businessHours", {
            type: sequelize_1.DataTypes.JSON,
            allowNull: true
        });
        yield queryInterface.addColumn("Tenants", "message", {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true
        });
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.removeColumn("Tenants", "message");
        yield queryInterface.removeColumn("Tenants", "businessHours");
        yield queryInterface.removeColumn("Tenants", "document");
        yield queryInterface.removeColumn("Tenants", "logo");
    })
};
