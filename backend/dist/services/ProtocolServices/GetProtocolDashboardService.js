"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Protocol_1 = __importDefault(require("../../models/Protocol"));
const GetProtocolDashboardService = async (tenantId) => {
    // 1. Status Counts
    const statusCounts = await Protocol_1.default.findAll({
        attributes: ["status", [sequelize_1.Sequelize.fn("COUNT", sequelize_1.Sequelize.col("id")), "count"]],
        where: { tenantId },
        group: ["status"],
        raw: true
    });
    // 2. Priority Counts
    const priorityCounts = await Protocol_1.default.findAll({
        attributes: ["priority", [sequelize_1.Sequelize.fn("COUNT", sequelize_1.Sequelize.col("id")), "count"]],
        where: { tenantId },
        group: ["priority"],
        raw: true
    });
    // 3. Category Counts (Top 10)
    const categoryCounts = await Protocol_1.default.findAll({
        attributes: ["category", [sequelize_1.Sequelize.fn("COUNT", sequelize_1.Sequelize.col("id")), "count"]],
        where: {
            tenantId,
            category: { [sequelize_1.Op.ne]: null }
        },
        group: ["category"],
        order: [[sequelize_1.Sequelize.col("count"), "DESC"]],
        limit: 10,
        raw: true
    });
    // 4. SLA Status (Overdue vs OnTime)
    // Only for OPEN or IN_PROGRESS protocols that have a dueDate
    const openProtocols = await Protocol_1.default.findAll({
        where: {
            tenantId,
            status: { [sequelize_1.Op.in]: ["open", "in_progress"] },
            dueDate: { [sequelize_1.Op.ne]: null }
        },
        attributes: ["id", "dueDate"]
    });
    let onTime = 0;
    let overdue = 0;
    const now = new Date();
    openProtocols.forEach(p => {
        if (p.dueDate && new Date(p.dueDate) < now) {
            overdue++;
        }
        else {
            onTime++;
        }
    });
    return {
        statusCounts,
        priorityCounts,
        categoryCounts,
        slaStatus: { onTime, overdue }
    };
};
exports.default = GetProtocolDashboardService;
