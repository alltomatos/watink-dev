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
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Tenant_1 = __importDefault(require("../../models/Tenant"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const AssociateWhatsappQueue_1 = __importDefault(require("./AssociateWhatsappQueue"));
const EntityTagService_1 = __importDefault(require("../TagServices/EntityTagService"));
const CreateWhatsAppService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ name, status = "DISCONNECTED", queueIds = [], greetingMessage, farewellMessage, isDefault = false, syncHistory = false, syncPeriod, keepAlive, tenantId, type = "whatsapp", chatConfig = {}, tags, engineType, importOldMessages }) {
    const schema = Yup.object().shape({
        name: Yup.string()
            .required()
            .min(2)
            .test("Check-name", "This whatsapp name is already used.", (value) => __awaiter(void 0, void 0, void 0, function* () {
            if (!value)
                return false;
            const nameExists = yield Whatsapp_1.default.findOne({
                where: { name: value }
            });
            return !nameExists;
        })),
        isDefault: Yup.boolean().required()
    });
    try {
        yield schema.validate({ name, status, isDefault });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    if (process.env.TENANTS === "true" && tenantId) {
        const tenant = yield Tenant_1.default.findOne({ where: { id: tenantId } });
        if (tenant) {
            const whatsappCount = yield Whatsapp_1.default.count({ where: { tenantId } });
            if (whatsappCount >= tenant.maxConnections) {
                throw new AppError_1.default("ERR_MAX_CONNECTIONS_REACHED", 403);
            }
        }
    }
    const whatsappFound = yield Whatsapp_1.default.findOne();
    isDefault = !whatsappFound;
    let oldDefaultWhatsapp = null;
    if (isDefault) {
        oldDefaultWhatsapp = yield Whatsapp_1.default.findOne({
            where: { isDefault: true }
        });
        if (oldDefaultWhatsapp) {
            yield oldDefaultWhatsapp.update({ isDefault: false });
        }
    }
    if (queueIds.length > 1 && !greetingMessage) {
        throw new AppError_1.default("ERR_WAPP_GREETING_REQUIRED");
    }
    const whatsapp = yield Whatsapp_1.default.create({
        name,
        status,
        greetingMessage,
        farewellMessage,
        isDefault,
        syncHistory,
        syncPeriod,
        keepAlive,
        tenantId,
        type,
        chatConfig: chatConfig ? JSON.stringify(chatConfig) : null,
        engineType
    }, { include: ["queues"] });
    yield (0, AssociateWhatsappQueue_1.default)(whatsapp, queueIds);
    if (tags && tags.length > 0) {
        yield EntityTagService_1.default.BulkApplyTags({
            tagIds: tags,
            entityType: "whatsapp",
            entityId: whatsapp.id,
            tenantId: tenantId ? tenantId.toString() : "1" // Fallback usually not needed if auth middleware works
        });
    }
    return { whatsapp, oldDefaultWhatsapp };
});
exports.default = CreateWhatsAppService;
