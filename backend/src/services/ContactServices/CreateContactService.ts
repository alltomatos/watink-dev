import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import RabbitMQService from "../../services/RabbitMQService";
import { v4 as uuidv4 } from "uuid";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import EntityTagService from "../TagServices/EntityTagService";
import { waitForContactEnrichment } from "./CreateOrUpdateContactService";
import { resolveContactsByIdentity, chooseCanonicalContact, buildCanonicalContactIdentity } from "./WhatsAppContactIdentityService";
import MergeContactsService from "./MergeContactsService";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  email?: string;
  profilePicUrl?: string;
  walletUserId?: number | null;
  extraInfo?: ExtraInfo[];
  tenantId?: string;
  waitEnrichment?: boolean;
  tags?: number[];
}

const CreateContactService = async ({
  name,
  number,
  email = "",
  walletUserId,
  extraInfo = [],
  tenantId,
  waitEnrichment = false,
  tags
}: Request): Promise<Contact> => {
  if (!tenantId) {
    throw new AppError("Tenant ID is required for creating a contact.", 403);
  }

  const identity = buildCanonicalContactIdentity({ number });
  const matches = await resolveContactsByIdentity({
    tenantId,
    number: identity.normalizedE164 || number,
    jid: number
  });

  let contact = chooseCanonicalContact(matches);

  if (contact) {
    for (const duplicate of matches.filter(c => c.id !== contact!.id)) {
      contact = await MergeContactsService({
        contactIdOrigin: duplicate.id,
        contactIdTarget: contact.id,
        tenantId
      });
    }

    await contact.update({
      name: contact.name || name,
      number: contact.number || identity.normalizedE164 || number,
      email: contact.email || email,
      walletUserId: contact.walletUserId || walletUserId || null
    });
  } else {
    contact = await Contact.create(
      {
        name,
        number: identity.normalizedE164 || number,
        email,
        walletUserId,
        extraInfo,
        tenantId
      },
      {
        include: ["extraInfo"]
      }
    );
  }

  if (tags && tags.length > 0) {
    await EntityTagService.BulkApplyTags({
      tagIds: tags,
      entityType: "contact",
      entityId: contact.id,
      tenantId
    });
  }

  try {
    const whatsapp = await Whatsapp.findOne({ where: { status: "CONNECTED", tenantId } });

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
            sessionId: whatsapp.id
          },
          tenantId
        }
      );

      logger.info(`[CreateContactService] Sent contact.sync command for contact ${contact.id}`);

      if (waitEnrichment) {
        await waitForContactEnrichment(contact.id, false, tenantId);
        await contact.reload();
      }
    } else {
      logger.warn(`[CreateContactService] No connected whatsapp found for tenant ${tenantId}. Skipping sync.`);
    }
  } catch (err) {
    logger.error(`[CreateContactService] Error sending sync command: ${err}`);
  }

  return contact;
};

export default CreateContactService;
