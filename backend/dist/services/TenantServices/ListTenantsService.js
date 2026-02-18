"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Tenant_1 = __importDefault(require("../../models/Tenant"));
const ListTenantsService = async () => {
    const tenants = await Tenant_1.default.findAll({
        order: [["name", "ASC"]]
    });
    return tenants;
};
exports.default = ListTenantsService;
