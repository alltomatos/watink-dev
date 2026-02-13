import WhatsAppGroup from "../../models/WhatsAppGroup";
import WhatsAppGroupParticipant from "../../models/WhatsAppGroupParticipant";

interface Request {
  tenantId: string | number;
  whatsappId: number;
  groupJid: string;
  subject?: string;
  contactId?: number;
  participantJid?: string;
  participantName?: string;
}

const UpsertWhatsAppGroupService = async ({
  tenantId,
  whatsappId,
  groupJid,
  subject,
  contactId,
  participantJid,
  participantName
}: Request): Promise<WhatsAppGroup> => {
  const [group] = await WhatsAppGroup.findOrCreate({
    where: { tenantId, groupJid },
    defaults: {
      tenantId,
      whatsappId,
      groupJid,
      subject: subject || groupJid,
      contactId,
      participantsCount: 0,
      metadataJson: {}
    }
  });

  await group.update({
    whatsappId,
    subject: subject || group.subject || groupJid,
    contactId: contactId || group.contactId
  });

  if (participantJid) {
    await WhatsAppGroupParticipant.upsert({
      groupId: group.id,
      tenantId,
      participantJid,
      participantName: participantName || participantJid,
      metadataJson: {}
    });
  }

  const participantsCount = await WhatsAppGroupParticipant.count({
    where: { groupId: group.id, tenantId }
  });

  await group.update({ participantsCount });

  return group;
};

export default UpsertWhatsAppGroupService;
