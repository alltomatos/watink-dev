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
        const now = new Date();
        const permissions = [
            {
                name: "view_marketplace",
                description: "Visualizar Marketplace",
                createdAt: now,
                updatedAt: now
            },
            {
                name: "edit_marketplace",
                description: "Editar Marketplace",
                createdAt: now,
                updatedAt: now
            }
        ];
        return queryInterface.bulkInsert("Permissions", permissions, { ignoreDuplicates: true });
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        return queryInterface.bulkDelete("Permissions", { name: ["view_marketplace", "edit_marketplace"] }, {});
    })
};
