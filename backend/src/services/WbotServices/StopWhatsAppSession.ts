import { v4 as uuidv4 } from "uuid";
import { Envelope } from "../../microservice/contracts";
import { logger } from "../../utils/logger";
import RabbitMQService from "../RabbitMQService";

const StopWhatsAppSession = async (whatsappId: number): Promise<void> => {
    try {
        const envelope: Envelope = {
            id: uuidv4(),
            timestamp: Date.now(),
            tenantId: 1,
            type: "session.stop",
            payload: {
                sessionId: whatsappId
            }
        };

        // Use the routing key pattern wbot.tenantId.sessionId.command
        await RabbitMQService.publishCommand(`wbot.1.${whatsappId}.session.stop`, envelope);

        logger.info(`Session stop command published for WhatsApp ID ${whatsappId}`);

    } catch (err) {
        logger.error("Error publishing session.stop command", err);
    }
};

export default StopWhatsAppSession;
