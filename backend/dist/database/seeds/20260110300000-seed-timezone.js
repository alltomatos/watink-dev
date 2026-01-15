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
exports.down = exports.up = void 0;
const up = (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
    // Use QueryTypes.SELECT to ensure we get just the results array
    const tenants = yield queryInterface.sequelize.query("SELECT id FROM \"Tenants\";", {
        type: queryInterface.sequelize.QueryTypes.SELECT
    });
    const tenantList = Array.isArray(tenants) && Array.isArray(tenants[0])
        ? tenants[0]
        : tenants;
    for (const tenant of tenantList) {
        // If tenant is metadata or malformed, skip
        if (!tenant || !tenant.id)
            continue;
        const tenantId = tenant.id;
        // Check if timezone setting exists for this tenant
        const timezoneSetting = yield queryInterface.rawSelect("Settings", {
            where: {
                key: "timezone",
                tenantId: tenantId
            }
        }, ["key"]);
        if (!timezoneSetting) {
            yield queryInterface.bulkInsert("Settings", [
                {
                    key: "timezone",
                    value: "-03:00",
                    tenantId: tenantId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]);
        }
    }
});
exports.up = up;
const down = (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
    yield queryInterface.bulkDelete("Settings", { key: "timezone" });
});
exports.down = down;
