import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import RabbitMQService from "../../services/RabbitMQService";
import { v4 as uuidv4 } from "uuid";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import EntityTagService from "../TagServices/EntityTagService";
import MergeContactsService from "./MergeContactsService";
import { buildCanonicalContactIdentity, resolveContactsByIdentity, chooseCanonicalContact } from "./WhatsAppContactIdentityService";

interface ExtraInfo {
  id?: number;
  name: string;
  value: string;
}
interface ContactData {
  email?: string;
  number?: string;
  name?: string;
  walletUserId?: number | null;
  extraInfo?: ExtraInfo[];
  lid?: string;
  tags?: number[];
}

interface Request {
  contactData: ContactData;
  contactId: string;
}

const UpdateContactService = async ({ contactData, contactId }: Request): Promise<Contact> => {
  const { extraInfo } = contactData;

  let contact = await Contact.findOne({
    where: { id: contactId },
    attributes: ["id", "name", "number", "email", "profilePicUrl", "tenantId", "lid", "walletUserId"],
    include: ["extraInfo"]
  });

  if (!contact) throw new AppError("ERR_NO_CONTACT_FOUND", 404);

  const identity = buildCanonicalContactIdentity({
    lid: contactData.lid || contact.lid,
    number: contactData.number || contact.number
  });

  const identityMatches = await resolveContactsByIdentity({
    tenantId: contact.tenantId,
    lid: identity.normalizedLid,
    number: identity.normalizedE164 || contactData.number || contact.number,
    jid: contactData.number
  });

  const canonical = chooseCanonicalContact(identityMatches);
  if (canonical && canonical.id !== contact.id) {
    contact = await MergeContactsService({
      contactIdOrigin: contact.id,
      contactIdTarget: canonical.id,
      tenantId: contact.tenantId
    });
  }

  if (extraInfo) {
    await Promise.all(extraInfo.map(async info => ContactCustomField.upsert({ ...info, contactId: contact!.id })));

    await Promise.all(
      ((contact.extraInfo || []) as any[]).map(async oldInfo => {
        const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);
        if (stillExists === -1) await ContactCustomField.destroy({ where: { id: oldInfo.id } });
      })
    );
  }

  const { email, name, number, walletUserId, lid } = contactData;

  await contact.update({
    name,
    number: identity.normalizedE164 || number,
    email,
    walletUserId,
    lid: identity.normalizedLid || lid
  });

  if (contactData.tags) {
    await EntityTagService.SyncEntityTags({
      tagIds: contactData.tags,
      entityType: "contact",
      entityId: contact.id,
      tenantId: contact.tenantId as string
    });
  }

  await contact.reload({
    attributes: ["id", "name", "number", "email", "profilePicUrl", "tenantId", "lid"],
    include: ["extraInfo", "tags"]
  });

  try {
    const tenantId = contact.tenantId || 1;
    const whatsapp = await Whatsapp.findOne({ where: { status: "CONNECTED", tenantId: tenantId.toString() } });

    if (whatsapp) {
      await RabbitMQService.publishCommand(
        RabbitMQService.generateRoutingKey(tenantId, whatsapp.engineType, whatsapp.id, "contact.sync"),
        {
          id: uuidv4(),
          timestamp: Date.now(),
          type: "contact.sync",
          payload: {
            contactId: contact.id,
            number: contact.number,
            lid: contact.lid,
            sessionId: whatsapp.id
          },
          tenantId
        }
      );
      logger.info(`[UpdateContactService] Sent contact.sync command for contact ${contact.id}`);
    }
  } catch (err) {
    logger.error(`[UpdateContactService] Error sending sync command: ${err}`);
  }

  return contact;
};

export default UpdateContactService;
