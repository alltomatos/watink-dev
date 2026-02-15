"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Deal_1 = __importDefault(require("../../models/Deal"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const CreateDealService = async (dealData) => {
    const { title, value, priority, contactId, ticketId, pipelineId, stageId, tenantId } = dealData;
    const schema = Yup.object().shape({
        title: Yup.string().required(),
        contactId: Yup.number().required(),
        pipelineId: Yup.number().required()
    });
    try {
        await schema.validate({ title, contactId, pipelineId });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    // Verify contact existence
    const contact = await Contact_1.default.findByPk(contactId);
    if (!contact) {
        throw new AppError_1.default("ERR_NO_CONTACT_FOUND", 404);
    }
    // Optionally verify ticket existence if provided
    if (ticketId) {
        const ticket = await Ticket_1.default.findByPk(ticketId);
        if (!ticket) {
            throw new AppError_1.default("ERR_NO_TICKET_FOUND", 404);
        }
    }
    const deal = await Deal_1.default.create({
        title,
        value,
        priority,
        contactId,
        ticketId,
        pipelineId,
        stageId,
        tenantId
    });
    return deal;
};
exports.default = CreateDealService;
