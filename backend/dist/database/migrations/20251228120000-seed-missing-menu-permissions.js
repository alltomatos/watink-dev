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
                name: "view_dashboard",
                description: "Visualizar Dashboard",
                createdAt: now,
                updatedAt: now,
            },
            {
                name: "view_pipelines",
                description: "Visualizar Pipelines",
                createdAt: now,
                updatedAt: now,
            },
            {
                name: "view_swagger",
                description: "Visualizar Swagger",
                createdAt: now,
                updatedAt: now,
            }
        ];
        const newPermissions = [];
        for (const p of permissions) {
            const [exists] = yield queryInterface.sequelize.query(`SELECT id FROM "Permissions" WHERE name = '${p.name}';`);
            if (!exists || exists.length === 0) {
                newPermissions.push(p);
            }
        }
        if (newPermissions.length > 0) {
            yield queryInterface.bulkInsert("Permissions", newPermissions);
        }
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        const permissions = [
            "view_dashboard",
            "view_pipelines",
            "view_swagger"
        ];
        yield queryInterface.bulkDelete("Permissions", { name: permissions });
    }),
};
