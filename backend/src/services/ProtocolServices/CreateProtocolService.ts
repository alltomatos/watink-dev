import Protocol from "../../models/Protocol";
import ProtocolHistory from "../../models/ProtocolHistory";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Ticket from "../../models/Ticket";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import RabbitMQService from "../RabbitMQService";
import { Envelope } from "../../microservice/contracts";

interface CreateProtocolData {
    tenantId: string | number;
    ticketId?: number;
    contactId?: number;
    userId?: number;
    subject: string;
    description?: string;
    priority?: string;
    category?: string;
    dueDate?: Date;
    carouselCards?: any[]; // Array of cards
}

const generateProtocolNumber = (): string => {
    const date = format(new Date(), "yyyyMMdd");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${date}-${random}`;
};

import SendWhatsAppCarousel from "../WbotServices/SendWhatsAppCarousel";
import SendWhatsAppUrlButton from "../WbotServices/SendWhatsAppUrlButton";

const CreateProtocolService = async (
    data: CreateProtocolData,
    createdByUserId?: number
): Promise<Protocol> => {
    const protocolNumber = generateProtocolNumber();

    const protocol = await Protocol.create({
        ...data,
        protocolNumber,
        status: "open"
    });

    // Create history entry
    await ProtocolHistory.create({
        protocolId: protocol.id,
        userId: createdByUserId,
        action: "created",
        newValue: "open",
        comment: `Protocolo ${protocolNumber} criado`
    });

    const fullProtocol = await Protocol.findByPk(protocol.id, {
        include: [
            { model: Contact, as: "contact" },
            { model: User, as: "user" },
            { model: Ticket, as: "ticket" },
            { model: ProtocolHistory, as: "history", include: [{ model: User, as: "user" }] }
        ]
    });

    // Send automatic message if ticketId is present
    if (data.ticketId) {
        try {
            // TODO: Restore Carousel logic if needed. Currently using reliable RabbitMQ interactive message.
            // if (data.carouselCards && data.carouselCards.length > 0) { ... }

            if (fullProtocol?.ticket && fullProtocol.ticket.whatsappId) {
                const { contact, ticket } = fullProtocol;
                const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
                const protocolUrl = `${appUrl}/public/protocols/${protocol.token}`; // Use token URL from HEAD idea, it's better for public access

                const priorityMap: Record<string, string> = {
                    low: "Baixa",
                    medium: "Normal",
                    high: "Alta",
                    urgent: "Urgente"
                };

                const payload = {
                    sessionId: ticket.whatsappId,
                    to: `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                    text: `*Olá! Seu protocolo de atendimento foi criado com sucesso.*\n\n*Protocolo:* #${protocol.protocolNumber}\n*Assunto:* ${protocol.subject}\n*Prioridade:* ${priorityMap[protocol.priority] || protocol.priority}\n\nAcompanhe o andamento clicando no botão abaixo.`,
                    footer: `Protocolo: ${protocol.protocolNumber} - ${format(new Date(), "HH:mm")}`,
                    buttons: [
                        {
                            type: "url",
                            text: "👁️ Ver Protocolo",
                            url: protocolUrl
                        }
                    ],
                    messageId: uuidv4()
                };

                const command: Envelope = {
                    id: uuidv4(),
                    timestamp: Date.now(),
                    tenantId: data.tenantId,
                    type: "message.send.interactive",
                    payload
                };

                await RabbitMQService.publishCommand(
                    `wbot.${data.tenantId}.${ticket.whatsappId}.message.send.interactive`,
                    command
                );
            }
        } catch (error) {
            console.error("Error sending protocol creation message:", error);
        }
    }

    return fullProtocol!;
};

export default CreateProtocolService;
