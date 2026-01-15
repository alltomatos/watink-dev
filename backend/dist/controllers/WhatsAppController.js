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
exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const CreateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/CreateWhatsAppService"));
const DeleteWhatsAppService_1 = __importDefault(require("../services/WhatsappService/DeleteWhatsAppService"));
const ListWhatsAppsService_1 = __importDefault(require("../services/WhatsappService/ListWhatsAppsService"));
const ShowWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppService"));
const UpdateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppService"));
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const whatsapps = yield (0, ListWhatsAppsService_1.default)(tenantId);
    return res.status(200).json(whatsapps);
});
exports.index = index;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, status, isDefault, greetingMessage, farewellMessage, queueIds, syncHistory, syncPeriod, keepAlive, type, chatConfig } = req.body;
    const { tenantId } = req.user;
    const { whatsapp, oldDefaultWhatsapp } = yield (0, CreateWhatsAppService_1.default)({
        name,
        status,
        isDefault,
        greetingMessage,
        farewellMessage,
        queueIds,
        syncHistory,
        syncPeriod,
        keepAlive,
        type,
        chatConfig,
        tenantId
    });
    // StartWhatsAppSession(whatsapp); // [REMOVED] Manual connect only
    const io = (0, socket_1.getIO)();
    io.emit("whatsapp", {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.emit("whatsapp", {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
});
exports.store = store;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    const whatsapp = yield (0, ShowWhatsAppService_1.default)(whatsappId);
    return res.status(200).json(whatsapp);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    const whatsappData = req.body;
    const { whatsapp, oldDefaultWhatsapp } = yield (0, UpdateWhatsAppService_1.default)({
        whatsappData,
        whatsappId
    });
    const io = (0, socket_1.getIO)();
    io.emit("whatsapp", {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.emit("whatsapp", {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    yield (0, DeleteWhatsAppService_1.default)(whatsappId);
    const io = (0, socket_1.getIO)();
    io.emit("whatsapp", {
        action: "delete",
        whatsappId: +whatsappId
    });
    return res.status(200).json({ message: "Whatsapp deleted." });
});
exports.remove = remove;
