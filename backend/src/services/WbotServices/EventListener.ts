import { Envelope, QrCodePayload, SessionStatusPayload, MessageReceivedPayload } from "../../microservice/contracts";
import RabbitMQService from "../RabbitMQService";
import { logger } from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import Contact from "../../models/Contact";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";

export const EventListener = async () => {
  const routingKeys = [
    "wbot.*.*.session.qrcode",
    "wbot.*.*.session.status",
    "wbot.*.*.message.received"
  ];

  await RabbitMQService.consumeEvents("api.events.process", routingKeys, async (msg: Envelope) => {
    logger.info(`Event received: ${msg.type}`);

    switch (msg.type) {
      case "session.qrcode":
        await handleQrCode(msg.payload as QrCodePayload);
        break;
      case "session.status":
        await handleSessionStatus(msg.payload as SessionStatusPayload);
        break;
      case "message.received":
        await handleMessageReceived(msg.payload as MessageReceivedPayload, msg.tenantId);
        break;
      default:
        logger.warn(`Unknown event type: ${msg.type}`);
    }
  });
};

const handleQrCode = async (payload: QrCodePayload) => {
  const io = getIO();
  await Whatsapp.update(
    { qrcode: payload.qrcode, status: "QRCODE" },
    { where: { id: payload.sessionId } }
  );

  io.emit(`whatsappSession`, {
    action: "update",
    session: { id: payload.sessionId, qrcode: payload.qrcode, status: "QRCODE" }
  });
};

const handleSessionStatus = async (payload: SessionStatusPayload) => {
  const io = getIO();
  await Whatsapp.update(
    { status: payload.status, qrcode: "" },
    { where: { id: payload.sessionId } }
  );

  io.emit(`whatsappSession`, {
    action: "update",
    session: { id: payload.sessionId, status: payload.status }
  });
};

const handleMessageReceived = async (payload: MessageReceivedPayload, tenantId: string | number) => {
  const { message, sessionId } = payload;

  const whatsapp = await Whatsapp.findByPk(sessionId);
  if (!whatsapp) return;

  const contactData = {
    name: message.from, // Ideally get name from payload if available
    number: message.from.replace(/\D/g, ""),
    isGroup: message.isGroup,
    tenantId: tenantId
  };

  const contact = await CreateOrUpdateContactService(contactData);

  const ticket = await FindOrCreateTicketService(
    contact,
    whatsapp.id,
    1 // Unread messages
  );

  const msgData = {
    id: message.id,
    ticketId: ticket.id,
    contactId: contact.id,
    body: message.body,
    fromMe: message.fromMe,
    read: false,
    mediaType: message.type,
    mediaUrl: message.mediaUrl,
    timestamp: message.timestamp * 1000 // Convert to ms
  };

  await CreateMessageService({ messageData: msgData });
};
