import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import RabbitMQService from "../RabbitMQService";
import { v4 as uuidv4 } from "uuid";
import { DownloadProfileImage } from "../../helpers/DownloadProfileImage";
import MergeContactsService from "./MergeContactsService";
import { logger } from "../../utils/logger";
import {
  buildCanonicalContactIdentity,
  chooseCanonicalContact,
  resolveContactsByIdentity
} from "./WhatsAppContactIdentityService";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number?: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  lid?: string;
  tenantId?: number | string;
  waitEnrichment?: boolean;
  sessionId?: number;
}

export const waitForContactEnrichment = async (contactId: number, isGroup: boolean, tenantId: string | number) => {
  const MAX_WAIT_MS = 5000;
  const POLLING_INTERVAL = 500;
  let waited = 0;

  logger.info(`[Barrier] Waiting for enrichment of contact ${contactId} (Group: ${isGroup})...`);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  while (waited < MAX_WAIT_MS) {
    const contact = await Contact.findByPk(contactId);
    if (!contact) return;

    const hasPhoto = !!contact.profilePicUrl;
    const hasRealName = contact.name && contact.name !== contact.number;
    const isReady = !!(hasPhoto && hasRealName);

    if (isReady) {
      logger.info(`[Barrier] Contact ${contactId} enriched after ${waited}ms!`);
      return;
    }

    await sleep(POLLING_INTERVAL);
    waited += POLLING_INTERVAL;
  }

  logger.warn(`[Barrier] Timeout waiting for enrichment of contact ${contactId} after ${MAX_WAIT_MS}ms. Proceeding anyway.`);
};

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = [],
  lid,
  tenantId,
  waitEnrichment = false,
  sessionId
}: Request): Promise<Contact> => {
  if (!tenantId) {
    throw new Error("Tenant ID is required for CreateOrUpdateContactService");
  }

  const io = getIO();
  const backendUrl = process.env.URL_BACKEND || process.env.BACKEND_URL || "http://localhost:8080";
  const identity = buildCanonicalContactIdentity({ lid, number: rawNumber, jid: rawNumber });

  let contact: Contact | null = null;
  const matches = await resolveContactsByIdentity({
    tenantId,
    lid: identity.normalizedLid,
    number: identity.normalizedE164 || rawNumber,
    jid: identity.normalizedJid
  });

  if (matches.length > 0) {
    contact = chooseCanonicalContact(matches);

    if (contact) {
      const duplicates = matches.filter(c => c.id !== contact!.id);
      for (const duplicate of duplicates) {
        contact = await MergeContactsService({
          contactIdOrigin: duplicate.id,
          contactIdTarget: contact.id,
          tenantId
        });
      }
    }
  }

  if (contact) {
    const updates: any = {};

    if (identity.normalizedLid && !contact.lid) updates.lid = identity.normalizedLid;
    if (identity.normalizedE164 && !contact.number) updates.number = identity.normalizedE164;

    if (isGroup && name) {
      const newNameIsJid = name.includes("@g.us");
      const currentNameIsJid = contact.name?.includes("@g.us") || contact.name === contact.number;
      if (!newNameIsJid || currentNameIsJid) updates.name = name;
    } else if (name) {
      const newNameIsNumber = name.replace(/\D/g, "") === name || name.includes("@");
      const currentNameIsNumber = contact.name?.replace(/\D/g, "") === contact.name || contact.name?.includes("@");
      if (!newNameIsNumber || currentNameIsNumber) updates.name = name;
    }

    if (isGroup && !contact.isGroup) updates.isGroup = true;

    if (profilePicUrl && profilePicUrl !== contact.profilePicUrl) {
      const filename = await DownloadProfileImage({ profilePicUrl, tenantId, contactId: contact.id });
      updates.profilePicUrl = filename
        ? `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`
        : profilePicUrl;
    }

    if (Object.keys(updates).length > 0) {
      await contact.update(updates);
      await contact.reload();
    }

    io.emit("contact", { action: "update", contact });
  } else {
    contact = await Contact.create({
      name,
      number: identity.normalizedE164 || null,
      lid: identity.normalizedLid || null,
      profilePicUrl: "",
      email,
      isGroup,
      extraInfo,
      tenantId
    });

    if (profilePicUrl) {
      const filename = await DownloadProfileImage({ profilePicUrl, tenantId, contactId: contact.id });
      const finalUrl = filename
        ? `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`
        : profilePicUrl;
      await contact.update({ profilePicUrl: finalUrl });
      await contact.reload();
    }

    io.emit("contact", { action: "create", contact });
  }

  if (waitEnrichment && sessionId && contact) {
    const shouldSync = isGroup
      ? (contact.name === contact.number || !contact.profilePicUrl)
      : (!contact.profilePicUrl || (!contact.lid && !contact.number?.includes("@lid") && !contact.name));

    if (shouldSync) {
      const whatsapp = await Whatsapp.findByPk(sessionId);
      if (whatsapp) {
        await RabbitMQService.publishCommand(
          RabbitMQService.generateRoutingKey(tenantId, whatsapp.engineType, sessionId, "contact.sync"),
          {
            id: uuidv4(),
            timestamp: Date.now(),
            tenantId,
            type: "contact.sync",
            payload: {
              sessionId,
              contactId: contact.id,
              number: contact.number,
              lid: contact.lid || undefined,
              isGroup
            }
          }
        );

        await waitForContactEnrichment(contact.id, isGroup, tenantId);
        await contact.reload();
      }
    }
  }

  return contact;
};

export default CreateOrUpdateContactService;
