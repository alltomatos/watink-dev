import { Envelope, QrCodePayload, SessionStatusPayload, MessageReceivedPayload, PairingCodePayload } from "../../microservice/contracts";
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
    "wbot.*.*.session.pairingcode",
    "wbot.*.*.session.status",
    "wbot.*.*.message.received"
  ];

  await RabbitMQService.consumeEvents("api.events.process", routingKeys, async (msg: Envelope) => {
    logger.info(`Event received: ${msg.type}`);

    switch (msg.type) {
      case "session.qrcode":
        await handleQrCode(msg.payload as QrCodePayload);
        break;
      case "session.pairingcode":
        await handlePairingCode(msg.payload as PairingCodePayload);
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

const handlePairingCode = async (payload: PairingCodePayload) => {
  const io = getIO();

  io.emit(`whatsappSession`, {
    action: "update",
    session: { id: payload.sessionId, pairingCode: payload.pairingCode, status: "QRCODE" }
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

  let groupContact: Contact | undefined;
  let msgContact: Contact | undefined;

  if (message.isGroup) {
    // 1. Group Contact (Ticket Owner)
    const groupData = {
      name: message.from, // TODO: Fetch real group subject if possible
      number: message.from.replace(/\D/g, ""),
      isGroup: true,
      tenantId
    };

    // We don't want to overwrite the group name with JID if it already exists and has a name
    // CreateOrUpdateContactService overwrites name. Ideally we should check this.
    // For now, passing message.from as name is standard behavior if name not known.
    groupContact = await CreateOrUpdateContactService(groupData);

    // 2. Participant Contact (Sender)
    const participant = message.participant || "";
    const participantNumber = participant.replace(/\D/g, "");
    const isLid = participant.includes("@lid");

    const participantData = {
      name: message.pushName || participantNumber,
      number: isLid ? "" : participantNumber, // Use empty string or null? Service expects string usually or null logic
      // Validation: CreateOrUpdateContactService uses `number` for lookup if LID not present. 
      // If LID, `number` is set to null in create. 
      // Here we pass string, service handles it. logic: number = isGroup ? raw : replace.
      lid: isLid ? participant : undefined,
      isGroup: false,
      tenantId,
      profilePicUrl: message.profilePicUrl
    };
    msgContact = await CreateOrUpdateContactService(participantData as any);
  } else {
    // Individual Contact
    const isLid = message.from.includes("@lid");
    const number = message.from.replace(/\D/g, "");

    const contactData = {
      name: message.pushName || message.from,
      number: isLid ? "" : number,
      lid: isLid ? message.from : undefined,
      isGroup: false,
      tenantId,
      profilePicUrl: message.profilePicUrl
    };

    msgContact = await CreateOrUpdateContactService(contactData as any);
    groupContact = msgContact;
  }

  const ticket = await FindOrCreateTicketService(
    groupContact,
    whatsapp.id,
    1 // Unread messages
  );

  const msgData = {
    id: message.id,
    ticketId: ticket.id,
    contactId: msgContact.id, // Message attributed to sender
    body: message.body,
    fromMe: message.fromMe,
    read: false,
    mediaType: message.type,
    mediaUrl: message.mediaUrl,
    timestamp: message.timestamp * 1000, // Convert to ms
    participant: message.participant
  };

  await CreateMessageService({ messageData: msgData as any });
};
