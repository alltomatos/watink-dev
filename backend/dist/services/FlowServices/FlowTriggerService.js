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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FlowTrigger_1 = __importDefault(require("../../models/FlowTrigger"));
const Flow_1 = __importDefault(require("../../models/Flow"));
class FlowTriggerService {
    findTrigger(type, context, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const triggers = yield FlowTrigger_1.default.findAll({
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
        });
    }
}
exports.default = new FlowTriggerService();
