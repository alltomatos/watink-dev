import { v4 as uuidv4 } from "uuid";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import RabbitMQService from "../RabbitMQService";
import { Envelope } from "../../microservice/contracts";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  usePairingCode?: boolean,
  phoneNumber?: string
): Promise<void> => {
  await whatsapp.update({ status: "OPENING" });
  logger.info(`StartWhatsAppSession called for session ${whatsapp.id}`);

  const io = getIO();
  io.emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });

  try {
    const command: Envelope = {
      id: uuidv4(),
      timestamp: Date.now(),
      tenantId: 1, // Default tenant for now, or fetch from whatsapp if available
      type: "session.start",
      payload: {
        sessionId: whatsapp.id,
        usePairingCode,
        phoneNumber
      }
    };

    await RabbitMQService.publishCommand(`wbot.1.${whatsapp.id}.session.start`, command);
    logger.info(`Session start command published for session ${whatsapp.id}`);
  } catch (err) {
    logger.error(err);
  }
};
