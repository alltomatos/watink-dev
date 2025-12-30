import { v4 as uuidv4 } from "uuid";
import { Envelope, QrCodePayload, SessionStatusPayload, MessageReceivedPayload, PairingCodePayload, ContactUpdatePayload } from "../../microservice/contracts";
import RabbitMQService from "../RabbitMQService";
import { logger } from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import Contact from "../../models/Contact";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import { DownloadProfileImage } from "../../helpers/DownloadProfileImage";

export const EventListener = async () => {
  const routingKeys = [
    "wbot.*.*.session.qrcode",
    "wbot.*.*.session.pairingcode",
    "wbot.*.*.session.status",
    "wbot.*.*.message.received",
    "wbot.*.*.contact.update"
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
      case "contact.update":
        await handleContactUpdate(msg.payload as ContactUpdatePayload, msg.tenantId);
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
    session: { id: payload.sessionId, pairingCode: payload.pairingCode, status: "PAIRING" }
  });
};

const handleSessionStatus = async (payload: SessionStatusPayload) => {
  const io = getIO();

  const updateData: any = { status: payload.status, qrcode: "" };
  if (payload.number) updateData.number = payload.number;
  if (payload.profilePicUrl) updateData.profilePicUrl = payload.profilePicUrl;

  await Whatsapp.update(
    updateData,
    { where: { id: payload.sessionId } }
  );

  io.emit(`whatsappSession`, {
    action: "update",
    session: {
      id: payload.sessionId,
      status: payload.status,
      number: payload.number,
      profilePicUrl: payload.profilePicUrl
    }
  });
};

import MergeContactsService from "../ContactServices/MergeContactsService";
import { Op } from "sequelize";

// ... previous imports

const handleContactUpdate = async (payload: ContactUpdatePayload, tenantId: string | number) => {
  logger.info(`[EventListener] Received contact.update for ${payload.number} (ID: ${payload.contactId})`);
  const { contactId, number, profilePicUrl, pushName, lid, isGroup } = payload;
  const backendUrl = process.env.URL_BACKEND || process.env.BACKEND_URL || "http://localhost:8080";

  let contact: Contact | null = null;

  if (contactId) {
    contact = await Contact.findByPk(contactId);
  }

  // If no contact found by ID (or no ID provided), try to find by LID or Number
  if (!contact) {
    if (lid) {
      contact = await Contact.findOne({ where: { lid, tenantId } });
    }
    if (!contact && number) {
      // Try finding by basic number or remoteJid equivalent
      contact = await Contact.findOne({
        where: {
          [Op.or]: [
            { number: number },
            { remoteJid: number }, // Engine sends JID in 'number' field for convenience sometimes
            { remoteJid: `${number}@${isGroup ? "g.us" : "s.whatsapp.net"}` }
          ],
          tenantId
        }
      });
    }
  }

  if (contact) {
    // 1. Check for LID Duplication/Collision
    if (lid && contact.lid && lid !== contact.lid) {
      const duplicate = await Contact.findOne({
        where: {
          lid: lid,
          tenantId: contact.tenantId, // Use contact's tenant to be safe
          id: { [Op.ne]: contact.id } // exclude self
        }
      });

      if (duplicate) {
        logger.info(`[EventListener] LID collision detected: ${lid}. Merging ${contact.id} into ${duplicate.id}`);

        await MergeContactsService({
          contactIdOrigin: contact.id,
          contactIdTarget: duplicate.id,
          tenantId: contact.tenantId
        });

        // After merge, the origin contact is destroyed. We stop here.
        return;
      }
    }

    // 2. Normal Update
    const updates: any = {};

    if (profilePicUrl) {
      const filename = await DownloadProfileImage({
        profilePicUrl,
        tenantId,
        contactId: contact.id
      });
      if (filename) {
        // Cache busting
        updates.profilePicUrl = `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`;
      } else {
        updates.profilePicUrl = profilePicUrl;
      }
    }
    if (lid) updates.lid = lid;
    if (pushName) updates.name = pushName; // Optionally update name if available

    if (Object.keys(updates).length > 0) {
      await contact.update(updates);

      const io = getIO();
      io.emit("contact", {
        action: "update",
        contact
      });
    }
  } else {
    // Optional: Create contact if it doesn't exist? 
    // For now, we only update existing contacts to avoid polluting DB with random group updates if the user isn't interacting with them.
    // However, for groups we are part of, we probably want them? 
    // Let's stick to updating existing ones for now to be safe.
  }
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

    // Logging diagnostic for missing participant
    if (!participant) {
      logger.error(`Group message ${message.id} from ${message.from} has NO participant! PushName: ${message.pushName}`);
    }

    const participantNumber = participant.replace(/\D/g, "");
    // Check if we received an explicit LID from the engine via onWhatsApp lookup
    const providedLid = message.senderLid;
    const isLid = participant.includes("@lid");

    const participantData = {
      name: message.pushName || participantNumber || "Unknown",
      number: providedLid ? participantNumber : (isLid ? null : (participantNumber || null)),
      lid: providedLid || (isLid ? participant : undefined),
      isGroup: false,
      tenantId,
      profilePicUrl: message.profilePicUrl
    };
    msgContact = await CreateOrUpdateContactService(participantData as any);
  } else {
    // Individual Contact
    const isLid = message.from.includes("@lid");
    const number = message.from.replace(/\D/g, "");
    const providedLid = message.senderLid;

    const contactData: any = {
      number: providedLid ? number : (isLid ? null : (number || null)),
      lid: providedLid || (isLid ? message.from : undefined),
      isGroup: false,
      tenantId,
    };

    // Only update name and pfp if message is NOT from me (incoming)
    if (!message.fromMe) {
      contactData.name = message.pushName || message.from;
      contactData.profilePicUrl = message.profilePicUrl;
    } else {
      // If fromMe, use the number/address as name just for creation if it doesn't exist
      // CreateOrUpdateContactService usually keeps existing name if we don't pass one, 
      // but if it requires a name for creation, we pass number.
      contactData.name = message.from;
    }

    msgContact = await CreateOrUpdateContactService(contactData);
  }

  // [NEW] Sync Contact/Group Info if missing
  const shouldSyncGroup = groupContact && (groupContact.name === groupContact.number || !groupContact.profilePicUrl);
  // Sync individual contact if no profile pic or if it's a legacy contact without LID (and not a LID itself)
  const shouldSyncContact = msgContact && (!msgContact.profilePicUrl || (!msgContact.lid && !msgContact.number?.includes("@lid")));

  if (shouldSyncGroup && groupContact) {
    await RabbitMQService.publishCommand(`wbot.${tenantId}.${sessionId}.contact.sync`, {
      id: uuidv4(),
      timestamp: Date.now(),
      tenantId,
      type: "contact.sync",
      payload: {
        sessionId,
        contactId: groupContact.id,
        number: groupContact.number,
        isGroup: true
      }
    });
  }

  if (shouldSyncContact && msgContact) {
    await RabbitMQService.publishCommand(`wbot.${tenantId}.${sessionId}.contact.sync`, {
      id: uuidv4(),
      timestamp: Date.now(),
      tenantId,
      type: "contact.sync",
      payload: {
        sessionId,
        contactId: msgContact.id,
        number: msgContact.number,
        lid: msgContact.lid || undefined,
        isGroup: false
      }
    });
  }

  // ... inside handleMessageReceived
  const ticket = await FindOrCreateTicketService(
    groupContact || msgContact,
    whatsapp.id,
    1, // Unread messages
    tenantId,
    groupContact
  );

  const msgData = {
    id: message.id,
    ticketId: ticket.id,
    contactId: msgContact.id,
    body: message.body,
    fromMe: message.fromMe,
    read: false,
    mediaType: message.type,
    mediaUrl: message.mediaUrl,
    timestamp: message.timestamp * 1000, // Convert to ms
    participant: message.participant,
    dataJson: JSON.stringify(message),
    tenantId
  };

  // Logic to handle media that arrived from Engine (Microservice)
  if (message.hasMedia && message.mediaData) {
    try {
      const { join } = require("path");
      const { writeFile } = require("fs").promises;
      const uploadConfig = require("../../config/upload").default;

      // Deduce extension
      const mimetype = message.mimetype || "";
      const ext = mimetype.split("/")[1]?.split(";")[0] || "bin";
      const filename = `${new Date().getTime()}-${message.id}.${ext}`;

      const filePath = join(uploadConfig.directory, filename);
      const buffer = Buffer.from(message.mediaData, "base64");

      await writeFile(filePath, buffer);

      msgData.mediaUrl = filename;

      // Fix mediaType to be more specific if Engine sent "media"
      if (message.type === "media") {
        if (mimetype.startsWith("image/")) msgData.mediaType = "image";
        else if (mimetype.startsWith("video/")) msgData.mediaType = "video";
        else if (mimetype.startsWith("audio/")) msgData.mediaType = "audio";
        else msgData.mediaType = "document";
      }
    } catch (err) {
      logger.error(`Error saving media for message ${message.id}: ${err}`);
      // Fallback: Don't block message creation, but it will lack media
    }
  }

  await CreateMessageService({ messageData: msgData as any });
};
