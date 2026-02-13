import { Op, Transaction } from "sequelize";
import sequelize from "../../database";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import ContactCustomField from "../../models/ContactCustomField";
import EntityTag from "../../models/EntityTag";
import ClientContact from "../../models/ClientContact";
import Deal from "../../models/Deal";
import Protocol from "../../models/Protocol";
import ConversationEmbedding from "../../models/ConversationEmbedding";
import WhatsAppGroup from "../../models/WhatsAppGroup";
import { logger } from "../../utils/logger";

interface Request {
  contactIdOrigin: number;
  contactIdTarget: number;
  tenantId: number | string;
  transaction?: Transaction;
}

const chooseBetterName = (target?: string, origin?: string, targetNumber?: string, originNumber?: string): string | undefined => {
  const isPlaceholder = (value?: string, number?: string) => {
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return true;
    if (number && normalized === String(number).trim().toLowerCase()) return true;
    return normalized.includes("@s.whatsapp.net") || normalized.includes("@c.us") || normalized.includes("@lid") || /^\d+$/.test(normalized);
  };

  if (isPlaceholder(target, targetNumber) && origin && !isPlaceholder(origin, originNumber)) {
    return origin;
  }

  return target || origin;
};

const mergeContactsTx = async ({
  contactIdOrigin,
  contactIdTarget,
  tenantId,
  transaction
}: Request): Promise<Contact> => {
  if (contactIdOrigin === contactIdTarget) {
    const same = await Contact.findOne({ where: { id: contactIdTarget, tenantId }, transaction });
    if (!same) throw new Error("ERR_CONTACT_NOT_FOUND_FOR_MERGE");
    return same;
  }

  const [contactOrigin, contactTarget] = await Promise.all([
    Contact.findOne({ where: { id: contactIdOrigin, tenantId }, transaction }),
    Contact.findOne({ where: { id: contactIdTarget, tenantId }, transaction })
  ]);

  if (!contactOrigin || !contactTarget) {
    throw new Error("ERR_CONTACT_NOT_FOUND_FOR_MERGE");
  }

  // Reatribuir vínculos principais
  await Promise.all([
    Ticket.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
    Message.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
    Deal.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
    Protocol.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
    ConversationEmbedding.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
    WhatsAppGroup.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
    ClientContact.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin }, transaction }),
  ]);

  // Mesclar extraInfo sem duplicar name+value
  const originExtraInfo = await ContactCustomField.findAll({ where: { contactId: contactIdOrigin }, transaction });
  const targetExtraInfo = await ContactCustomField.findAll({ where: { contactId: contactIdTarget }, transaction });

  const targetInfoKeys = new Set(targetExtraInfo.map(i => `${i.name}::${i.value}`));
  for (const info of originExtraInfo) {
    const key = `${info.name}::${info.value}`;
    if (!targetInfoKeys.has(key)) {
      await ContactCustomField.create({ name: info.name, value: info.value, contactId: contactIdTarget }, { transaction });
    }
  }

  // Mesclar tags (EntityTags)
  const originTags = await EntityTag.findAll({
    where: { entityType: "contact", entityId: contactIdOrigin },
    transaction
  });

  for (const tag of originTags) {
    const exists = await EntityTag.findOne({
      where: { entityType: "contact", entityId: contactIdTarget, tagId: tag.tagId },
      transaction
    });

    if (!exists) {
      await EntityTag.create(
        {
          tagId: tag.tagId,
          entityType: "contact",
          entityId: contactIdTarget,
          createdBy: tag.createdBy
        },
        { transaction }
      );
    }
  }

  const updates: any = {
    name: chooseBetterName(contactTarget.name, contactOrigin.name, contactTarget.number, contactOrigin.number),
    email: contactTarget.email || contactOrigin.email,
    number: contactTarget.number || contactOrigin.number,
    lid: contactTarget.lid || contactOrigin.lid,
    profilePicUrl: contactTarget.profilePicUrl || contactOrigin.profilePicUrl,
    isGroup: contactTarget.isGroup || contactOrigin.isGroup,
    walletUserId: contactTarget.walletUserId || contactOrigin.walletUserId
  };

  await contactTarget.update(updates, { transaction });

  // Limpeza de registros dependentes já copiados
  await Promise.all([
    ContactCustomField.destroy({ where: { contactId: contactIdOrigin }, transaction }),
    EntityTag.destroy({ where: { entityType: "contact", entityId: contactIdOrigin }, transaction })
  ]);

  await contactOrigin.destroy({ transaction });

  logger.info(`[MergeContactsService] Merged contact ${contactIdOrigin} into ${contactIdTarget} (tenant ${tenantId})`);

  await contactTarget.reload({ transaction });
  return contactTarget;
};

const MergeContactsService = async (params: Request): Promise<Contact> => {
  if (params.transaction) {
    return mergeContactsTx(params);
  }

  return sequelize.transaction(async (transaction) => {
    return mergeContactsTx({ ...params, transaction });
  });
};

export default MergeContactsService;
