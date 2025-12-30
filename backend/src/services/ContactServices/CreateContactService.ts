import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import RabbitMQService from "../../services/RabbitMQService";
import { v4 as uuidv4 } from "uuid";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  tenantId?: number | string;
}

const CreateContactService = async ({
  name,
  number,
  email = "",
  extraInfo = [],
  tenantId = 1
}: Request): Promise<Contact> => {
  const numberExists = await Contact.findOne({
    where: { number, tenantId }
  });

  if (numberExists) {
    throw new AppError("ERR_DUPLICATED_CONTACT");
  }

  const contact = await Contact.create(
    {
      name,
      number,
      email,
      extraInfo,
      tenantId
    },
    {
      include: ["extraInfo"]
    }
  );

  try {
    const whatsapp = await Whatsapp.findOne({
      where: { status: "CONNECTED", tenantId }
    });

    if (whatsapp) {
      await RabbitMQService.publishCommand("wbot.global.contact.sync", {
        id: uuidv4(),
        timestamp: Date.now(),
        type: "contact.sync",
        payload: {
          contactId: contact.id,
          number: contact.number,
          sessionId: whatsapp.id
        },
        tenantId
      });
      logger.info(
        `[CreateContactService] Sent contact.sync command for contact ${contact.id}`
      );
    } else {
      logger.warn(
        `[CreateContactService] No connected whatsapp found for tenant ${tenantId}. Skipping sync.`
      );
    }
  } catch (err) {
    logger.error(`[CreateContactService] Error sending sync command: ${err}`);
  }

  return contact;
};

export default CreateContactService;
