import { RabbitMQ } from "./rabbitmq";
import { Envelope } from "./contracts";
import { logger } from "./logger";

export class WebchatHandler {
    private rabbitmq: RabbitMQ;

    constructor(rabbitmq: RabbitMQ) {
        this.rabbitmq = rabbitmq;
    }

    async handleCommand(envelope: Envelope): Promise<void> {
        logger.info(`Processing command: ${envelope.type}`);

        switch (envelope.type) {
            case "webchat.message.send":
                await this.handleSendMessage(envelope);
                break;
            case "webchat.ticket.created":
                await this.handleTicketCreated(envelope);
                break;
            case "webchat.session.start":
                await this.handleSessionStart(envelope);
                break;
            default:
                logger.warn(`Unknown command type: ${envelope.type}`);
        }
    }

    /**
     * Processa envio de mensagem do atendente para o visitante.
     * Por enquanto, o visitante usa polling HTTP para buscar mensagens.
     * No futuro, pode implementar WebSocket push.
     */
    private async handleSendMessage(envelope: Envelope): Promise<void> {
        const { ticketId, body, contactId } = envelope.payload;
        logger.info(`Message to send - Ticket: ${ticketId}, Contact: ${contactId}`);

        // TODO: Implementar push notification via WebSocket
        // Por agora, as mensagens são salvas no banco pelo backend
        // e o widget faz polling para buscar
    }

    /**
     * Processa criação de novo ticket de webchat.
     */
    private async handleTicketCreated(envelope: Envelope): Promise<void> {
        const { ticketId, webchatId, contactId } = envelope.payload;
        logger.info(`Ticket created - ID: ${ticketId}, Webchat: ${webchatId}, Contact: ${contactId}`);

        // Pode ser usado para notificações internas, métricas, etc.
    }

    /**
     * Processa início de sessão de webchat.
     */
    private async handleSessionStart(envelope: Envelope): Promise<void> {
        const { webchatId } = envelope.payload;
        logger.info(`Webchat session started - ID: ${webchatId}`);
    }
}
