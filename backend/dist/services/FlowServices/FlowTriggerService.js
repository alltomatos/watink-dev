"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FlowTrigger_1 = __importDefault(require("../../models/FlowTrigger"));
const Flow_1 = __importDefault(require("../../models/Flow"));
class FlowTriggerService {
    async findTrigger(type, context, tenantId) {
        const triggers = await FlowTrigger_1.default.findAll({
            where: {
                type,
                isActive: true,
                tenantId
            },
            include: [{ model: Flow_1.default, as: "flow", where: { isActive: true } }]
        });
        // Filter by conditions
        // Simple exact match logic for now, can be expanded to Regex/JSON Logic
        const matchedTrigger = triggers.find((trigger) => {
            const condition = trigger.condition;
            // If no condition, it's a catch-all (be careful with these!)
            if (!condition || Object.keys(condition).length === 0)
                return true;
            // Check all keys in condition match context
            for (const key of Object.keys(condition)) {
                if (context[key] != condition[key]) {
                    return false;
                }
            }
            return true;
        });
        return matchedTrigger || null;
    }
}
exports.default = new FlowTriggerService();
