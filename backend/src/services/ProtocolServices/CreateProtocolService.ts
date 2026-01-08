import Protocol from "../../models/Protocol";
import ProtocolHistory from "../../models/ProtocolHistory";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Ticket from "../../models/Ticket";
import { format } from "date-fns";

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

    // Send automatic message if ticketId is present
    if (data.ticketId) {
        try {
            const ticket = await Ticket.findByPk(data.ticketId, { include: ["contact"] });
            if (ticket) {
                const publicUrl = `${process.env.FRONTEND_URL}/public/protocols/${protocol.token}`;

                try {
                    if (data.carouselCards && data.carouselCards.length > 0) {
                        // Send Dynamic Carousel
                        await SendWhatsAppCarousel({
                            ticket,
                            body: data.description || `Protocolo #${protocolNumber}`, // Use description or default
                            cards: data.carouselCards.map(card => ({
                                headerUrl: card.headerUrl,
                                title: card.title,
                                body: card.body,
                                footer: `Protocolo: ${protocolNumber}`,
                                buttons: card.buttons.map((btn: any) => ({
                                    type: btn.type,
                                    text: btn.text,
                                    url: btn.url, // Ensure frontend sends this
                                    buttonId: btn.buttonId // Or this
                                }))
                            }))
                        });
                    } else {
                        // Send Interactive Url Button (Bubble)
                        await SendWhatsAppUrlButton({
                            ticket,
                            body: `Olá! Seu protocolo de atendimento foi criado com sucesso.\n\n*Protocolo:* #${protocolNumber}\n*Assunto:* ${data.subject}\n*Prioridade:* ${data.priority === 'urgent' ? 'Urgente' : data.priority === 'high' ? 'Alta' : 'Normal'}\n\nAcompanhe o andamento clicando no botão abaixo.`,
                            footer: `Protocolo: ${protocolNumber}`,
                            url: publicUrl,
                            buttonText: "👁️ Ver Protocolo"
                        });
                    }
                } catch (error) {
                    console.error("Error sending protocol creation message:", error);
                }
            }
        } catch (error) {
            console.error("Error sending protocol creation message:", error);
        }
    }

    const fullProtocol = await Protocol.findByPk(protocol.id, {
        include: [
            { model: Contact, as: "contact" },
            { model: User, as: "user" },
            { model: Ticket, as: "ticket" },
            { model: ProtocolHistory, as: "history", include: [{ model: User, as: "user" }] }
        ]
    });

    return fullProtocol!;
};

export default CreateProtocolService;
