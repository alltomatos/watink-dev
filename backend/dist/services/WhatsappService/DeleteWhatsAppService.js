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
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const StopWhatsAppSession_1 = __importDefault(require("../WbotServices/StopWhatsAppSession"));
const DeleteWhatsAppService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const whatsapp = yield Whatsapp_1.default.findOne({
        where: { id }
    });
    if (!whatsapp) {
        throw new AppError_1.default("ERR_NO_WAPP_FOUND", 404);
    }
    if (whatsapp.status === "CONNECTED" ||
        whatsapp.status === "PAIRING" ||
        whatsapp.status === "OPENING") {
        throw new AppError_1.default("ERR_WAPP_CHECK_BEFORE_DELETE");
    }
    yield (0, StopWhatsAppSession_1.default)(whatsapp.id); // [NEW] Ensure session is stopped in engine
    yield whatsapp.destroy();
});
exports.default = DeleteWhatsAppService;
