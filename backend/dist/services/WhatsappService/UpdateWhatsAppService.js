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
const sequelize_1 = require("sequelize");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ShowWhatsAppService_1 = __importDefault(require("./ShowWhatsAppService"));
const AssociateWhatsappQueue_1 = __importDefault(require("./AssociateWhatsappQueue"));
const StopWhatsAppSession_1 = __importDefault(require("../WbotServices/StopWhatsAppSession"));
const logger_1 = require("../../utils/logger");
const UpdateWhatsAppService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ whatsappData, whatsappId }) {
    const schema = Yup.object().shape({
        name: Yup.string().min(2),
        status: Yup.string(),
        isDefault: Yup.boolean()
    });
    const { name, status, isDefault, session, greetingMessage, farewellMessage, queueIds = [], syncHistory, syncPeriod, keepAlive, type, chatConfig } = whatsappData;
    logger_1.logger.info(`UpdateWhatsAppService - ID: ${whatsappId}, Data: ${JSON.stringify(whatsappData)} `); // [DEBUG]
    try {
        yield schema.validate({ name, status, isDefault });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    if (queueIds.length > 1 && !greetingMessage) {
        throw new AppError_1.default("ERR_WAPP_GREETING_REQUIRED");
    }
    let oldDefaultWhatsapp = null;
    if (isDefault) {
        oldDefaultWhatsapp = yield Whatsapp_1.default.findOne({
            where: { isDefault: true, id: { [sequelize_1.Op.not]: whatsappId } }
        });
        if (oldDefaultWhatsapp) {
            yield oldDefaultWhatsapp.update({ isDefault: false });
        }
    }
    const whatsapp = yield (0, ShowWhatsAppService_1.default)(whatsappId);
    yield whatsapp.update({
        name,
        status,
        session,
        greetingMessage,
        farewellMessage,
        isDefault,
        syncHistory,
        syncPeriod,
        keepAlive,
        type,
        chatConfig
    });
    // [NEW] If critical settings changed, stop session to force reconnection with new settings
    if (whatsapp.status === "CONNECTED" && (syncHistory !== undefined || syncPeriod !== undefined || keepAlive !== undefined)) {
        // Import dynamically or at top if cycle allows. 
        // Using dynamic import or moving StopWhatsAppSession import to top.
        // Let's assume standard import at top.
    }
    yield (0, AssociateWhatsappQueue_1.default)(whatsapp, queueIds);
    // Checks if sync settings were updated and connection is active/opening
    if (syncHistory !== undefined || syncPeriod !== undefined || keepAlive !== undefined) {
        yield (0, StopWhatsAppSession_1.default)(whatsapp.id);
    }
    return { whatsapp, oldDefaultWhatsapp };
});
exports.default = UpdateWhatsAppService;
