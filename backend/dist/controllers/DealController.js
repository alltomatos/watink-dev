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
exports.remove = exports.update = exports.store = exports.index = void 0;
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const CreateDealService_1 = __importDefault(require("../services/DealServices/CreateDealService"));
const ListDealsService_1 = __importDefault(require("../services/DealServices/ListDealsService"));
const UpdateDealService_1 = __importDefault(require("../services/DealServices/UpdateDealService"));
const DeleteDealService_1 = __importDefault(require("../services/DealServices/DeleteDealService"));
const index = async (req, res) => {
    const { tenantId } = req.user;
    const { searchParam, pageNumber, pipelineId, stageId, ticketId } = req.query;
    const { deals, count, hasMore } = await (0, ListDealsService_1.default)({
        searchParam,
        pageNumber,
        pipelineId,
        stageId,
        ticketId,
        tenantId
    });
    return res.json({ deals, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { tenantId } = req.user;
    const dealData = { ...req.body, tenantId };
    const schema = Yup.object().shape({
        title: Yup.string().required(),
        contactId: Yup.number().required(),
        pipelineId: Yup.number().required()
    });
    try {
        await schema.validate(dealData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const deal = await (0, CreateDealService_1.default)(dealData);
    return res.status(200).json(deal);
};
exports.store = store;
const update = async (req, res) => {
    const { tenantId } = req.user;
    const { dealId } = req.params;
    const dealData = req.body;
    const deal = await (0, UpdateDealService_1.default)({ dealData, dealId, tenantId });
    return res.status(200).json(deal);
};
exports.update = update;
const remove = async (req, res) => {
    const { tenantId } = req.user;
    const { dealId } = req.params;
    await (0, DeleteDealService_1.default)({ id: dealId, tenantId });
    return res.status(200).json({ message: "Deal deleted" });
};
exports.remove = remove;
