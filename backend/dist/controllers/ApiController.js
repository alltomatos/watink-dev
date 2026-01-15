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
exports.index = void 0;
const Yup = __importStar(require("yup"));
const uuid_1 = require("uuid");
const AppError_1 = __importDefault(require("../errors/AppError"));
const GetDefaultWhatsApp_1 = __importDefault(require("../helpers/GetDefaultWhatsApp"));
const SetTicketMessagesAsRead_1 = __importDefault(require("../helpers/SetTicketMessagesAsRead"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const CreateOrUpdateContactService_1 = __importDefault(require("../services/ContactServices/CreateOrUpdateContactService"));
const FindOrCreateTicketService_1 = __importDefault(require("../services/TicketServices/FindOrCreateTicketService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const RabbitMQService_1 = __importDefault(require("../services/RabbitMQService"));
const createContact = (whatsappId, newContact) => __awaiter(void 0, void 0, void 0, function* () {
    // Basic cleaning only - validation happens in Engine
    const number = newContact.replace(/\D/g, "");
    let whatsapp;
    if (whatsappId === undefined) {
        whatsapp = yield (0, GetDefaultWhatsApp_1.default)();
    }
    else {
        whatsapp = yield Whatsapp_1.default.findByPk(whatsappId);
        if (whatsapp === null) {
            throw new AppError_1.default(`whatsapp #${whatsappId} not found`);
        }
    }
    const contactData = {
        name: `${number}`,
        number,
        profilePicUrl: "", // Will be fetched async
        isGroup: false,
        tenantId: whatsapp.tenantId
    };
    const contact = yield (0, CreateOrUpdateContactService_1.default)(contactData);
    const createTicket = yield (0, FindOrCreateTicketService_1.default)(contact, whatsapp.id, 1, whatsapp.tenantId);
    const ticket = yield (0, ShowTicketService_1.default)(createTicket.id);
    (0, SetTicketMessagesAsRead_1.default)(ticket);
    return ticket;
});
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const newContact = req.body;
    const { whatsappId } = req.body;
    const { body, quotedMsg } = req.body;
    const medias = req.files;
    newContact.number = newContact.number.replace("-", "").replace(" ", "");
    const schema = Yup.object().shape({
        number: Yup.string()
            .required()
            .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
    });
    try {
        yield schema.validate(newContact);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const contactAndTicket = yield createContact(whatsappId, newContact.number);
    if (medias) {
        yield Promise.all(medias.map((media) => __awaiter(void 0, void 0, void 0, function* () {
            // Send via RabbitMQ
            yield RabbitMQService_1.default.publishCommand(`wbot.${contactAndTicket.tenantId}.${contactAndTicket.whatsappId}.message.send.media`, {
                id: (0, uuid_1.v4)(),
                timestamp: Date.now(),
                tenantId: contactAndTicket.tenantId,
                type: "message.send.media",
                payload: {
                    sessionId: contactAndTicket.whatsappId,
                    to: `${contactAndTicket.contact.number}@${contactAndTicket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                    body: body,
                    media: {
                        mimetype: media.mimetype,
                        filename: media.originalname,
                        path: media.path
                    },
                    ticketId: contactAndTicket.id
                }
            });
        })));
    }
    else {
        // Send Text via RabbitMQ
        yield RabbitMQService_1.default.publishCommand(`wbot.${contactAndTicket.tenantId}.${contactAndTicket.whatsappId}.message.send.text`, {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId: contactAndTicket.tenantId,
            type: "message.send.text",
            payload: {
                sessionId: contactAndTicket.whatsappId,
                to: `${contactAndTicket.contact.number}@${contactAndTicket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                text: body,
                quotedMsg,
                ticketId: contactAndTicket.id
            }
        });
    }
    return res.send({ status: "SUCCESS" });
});
exports.index = index;
