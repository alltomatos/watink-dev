import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";

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
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = [],
  lid
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber?.replace(/[^0-9]/g, "");

  const io = getIO();
  let contact: Contact | null;

  if (lid) {
    contact = await Contact.findOne({ where: { lid } });
  } else {
    contact = await Contact.findOne({ where: { number: number || "" } });
  }

  if (contact) {
    contact.update({ profilePicUrl });
    // If we found by number but now have a LID, update it
    if (lid && !contact.lid) {
      contact.update({ lid });
    }

    if (isGroup && name) {
      contact.update({ name });
    }

    io.emit("contact", {
      action: "update",
      contact
    });
  } else {
    // If it has LID, we don't strictly need number (it can be null), or we keep number if meaningful.
    // For WhatsApp LIDs, usually number is not relevant/available in the same way.
    // But we might want to keep the rawNumber if it was passed.
    // Spec says: nullable number.

    contact = await Contact.create({
      name,
      number: lid ? null : number, // If LID, number can be null (or store it if we have it? Let's use null for pure LID contacts to avoid duplication issues)
      lid,
      profilePicUrl,
      email,
      isGroup,
      extraInfo
    });

    io.emit("contact", {
      action: "create",
      contact
    });
  }

  return contact;
};

export default CreateOrUpdateContactService;
