import { v4 as uuidv4 } from "uuid";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import RabbitMQService from "../RabbitMQService";
import { Envelope } from "../../microservice/contracts";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  usePairingCode?: boolean,
  phoneNumber?: string,
  force?: boolean // New param
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
      tenantId: whatsapp.tenantId,
      type: "session.start",
      payload: {
        sessionId: whatsapp.id,
        usePairingCode,
        phoneNumber,
        name: whatsapp.name,
        syncHistory: whatsapp.syncHistory,
        syncPeriod: whatsapp.syncPeriod,
        keepAlive: whatsapp.keepAlive,
        force // Pass force flag
      }
    };

    await RabbitMQService.publishCommand(`wbot.${whatsapp.tenantId}.${whatsapp.id}.session.start`, command);
    logger.info(`Session start command published for session ${whatsapp.id}`);
  } catch (err) {
    logger.error(err);
  }
};
