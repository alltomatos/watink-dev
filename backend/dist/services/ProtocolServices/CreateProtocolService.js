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
const Protocol_1 = __importDefault(require("../../models/Protocol"));
const ProtocolHistory_1 = __importDefault(require("../../models/ProtocolHistory"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const User_1 = __importDefault(require("../../models/User"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const date_fns_1 = require("date-fns");
const uuid_1 = require("uuid");
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const generateProtocolNumber = () => {
    const date = (0, date_fns_1.format)(new Date(), "yyyyMMdd");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${date}-${random}`;
};
const CreateProtocolService = (data, createdByUserId) => __awaiter(void 0, void 0, void 0, function* () {
    const protocolNumber = generateProtocolNumber();
    let dueDate = data.dueDate;
    // SLA Logic
    try {
        const enabledSetting = yield Setting_1.default.findOne({ where: { key: "helpdesk_settings_enabled", tenantId: data.tenantId } });
        if (enabledSetting && enabledSetting.value === "true") {
            const slaSetting = yield Setting_1.default.findOne({ where: { key: "helpdesk_sla_config", tenantId: data.tenantId } });
            if (slaSetting) {
                const slaConfig = JSON.parse(slaSetting.value);
                const priority = data.priority || "medium";
                const hours = slaConfig[priority];
                if (hours) {
                    dueDate = (0, date_fns_1.addHours)(new Date(), parseInt(hours));
                }
            }
        }
    }
    catch (err) {
        console.error("Error calculating SLA due date", err);
    }
    const protocol = yield Protocol_1.default.create(Object.assign(Object.assign({}, data), { dueDate,
        protocolNumber, status: "open" }));
    // Create history entry
    yield ProtocolHistory_1.default.create({
        protocolId: protocol.id,
        userId: createdByUserId,
        action: "created",
        newValue: "open",
        comment: `Protocolo ${protocolNumber} criado`
    });
    const fullProtocol = yield Protocol_1.default.findByPk(protocol.id, {
        include: [
            { model: Contact_1.default, as: "contact" },
            { model: User_1.default, as: "user" },
            { model: Ticket_1.default, as: "ticket" },
            { model: ProtocolHistory_1.default, as: "history", include: [{ model: User_1.default, as: "user" }] }
        ]
    });
    // Emit socket event for real-time Kanban updates
    try {
        const { getIO } = yield Promise.resolve().then(() => __importStar(require("../../libs/socket")));
        const io = getIO();
        io.to("helpdesk-kanban").emit("protocol", {
            action: "create",
            protocol: fullProtocol
        });
    }
    catch (err) {
        console.error("Error emitting protocol socket event:", err);
    }
    // Send automatic message if ticketId is present
    if (data.ticketId) {
        try {
            // TODO: Restore Carousel logic if needed. Currently using reliable RabbitMQ interactive message.
            // if (data.carouselCards && data.carouselCards.length > 0) { ... }
            if ((fullProtocol === null || fullProtocol === void 0 ? void 0 : fullProtocol.ticket) && fullProtocol.ticket.whatsappId) {
                const { contact, ticket } = fullProtocol;
                const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
                const protocolUrl = `${appUrl}/public/protocols/${protocol.token}`; // Use token URL from HEAD idea, it's better for public access
                const priorityMap = {
                    low: "Baixa",
                    medium: "Normal",
                    high: "Alta",
                    urgent: "Urgente"
                };
                const payload = {
                    sessionId: ticket.whatsappId,
                    to: `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                    text: `*Olá! Seu protocolo de atendimento foi criado com sucesso.*\n\n*Protocolo:* #${protocol.protocolNumber}\n*Assunto:* ${protocol.subject}\n*Prioridade:* ${priorityMap[protocol.priority] || protocol.priority}\n`,
                };
                // Fallback para Texto Simples para garantir entrega (Botões instáveis na API não-oficial)
                // protocolUrl já existe no escopo
                const textMessage = `${payload.text}\n🔗 Acompanhe seu protocolo clicando aqui:\n${protocolUrl}`;
                const command = {
                    id: (0, uuid_1.v4)(),
                    timestamp: Date.now(),
                    tenantId: data.tenantId,
                    type: "message.send.text",
                    payload: {
                        sessionId: ticket.whatsappId,
                        to: payload.to,
                        body: textMessage, // Engine espera 'body' (vide contracts.ts e session.ts)
                        ticketId: ticket.id
                    }
                };
                yield RabbitMQService_1.default.publishCommand(`wbot.${data.tenantId}.${ticket.whatsappId}.message.send.text`, command);
            }
        }
        catch (err) {
            console.error("Erro ao enviar mensagem de confirmação de protocolo:", err);
        }
    }
    return fullProtocol;
});
exports.default = CreateProtocolService;
