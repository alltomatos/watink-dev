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
}

const generateProtocolNumber = (): string => {
    const date = format(new Date(), "yyyyMMdd");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${date}-${random}`;
};

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

    // ... (imports e código anterior)

    const fullProtocol = await Protocol.findByPk(protocol.id, {
        include: [
            { model: Contact, as: "contact" },
            { model: User, as: "user" },
            { model: Ticket, as: "ticket" },
            { model: ProtocolHistory, as: "history", include: [{ model: User, as: "user" }] }
        ]
    });

    // Enviar mensagem de confirmação se houver ticket e conexão
    if (fullProtocol?.ticket && fullProtocol.ticket.whatsappId) {
        try {
            const { contact, ticket } = fullProtocol;
            const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            // Supondo rota /helpdesk/:id ou similar. Ajuste conforme necessário.
            const protocolUrl = `${appUrl}/helpdesk/${fullProtocol.id}`;

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

            // Fallback para Texto Simples para garantir entrega (Botões instáveis na API não-oficial)
            // protocolUrl já existe no escopo
            const textMessage = `${payload.text}\n\n${payload.footer}\n\n🔗 Acompanhe seu protocolo clicando aqui:\n${protocolUrl}`;

            const command: Envelope = {
                id: uuidv4(),
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

            await RabbitMQService.publishCommand(
                `wbot.${data.tenantId}.${ticket.whatsappId}.message.send.text`,
                command
            );
        } catch (err) {
            console.error("Erro ao enviar mensagem de confirmação de protocolo:", err);
        }
    }

    return fullProtocol!;
};

export default CreateProtocolService;
