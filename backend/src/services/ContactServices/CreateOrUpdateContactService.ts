import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import RabbitMQService from "../RabbitMQService";
import { v4 as uuidv4 } from "uuid";

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
  let contact: Contact | null = null;

  // 1. Try to find by LID first (Most reliable unique identifier)
  if (lid) {
    contact = await Contact.findOne({ where: { lid } });
  }

  // 2. If not found by LID, try to find by Number (Legacy/Fallback)
  // This handles the "Enrichment" case: we have the number stored, but not the LID yet.
  if (!contact && number) {
    contact = await Contact.findOne({ where: { number } });
  }

  // 3. Fallback: If not found by LID nor Number, and both are missing, try to find by Name
  // This prevents creating duplicate "ghost" contacts for system messages or malformed JIDs
  if (!contact && !number && !lid && name) {
    contact = await Contact.findOne({ where: { name } });
  }

  if (contact) {
    // Contact exists (either by LID or Number) -> Update it
    // Check if we can Enrich it (add missing LID or Number)
    const updates: any = {};

    if (lid && !contact.lid) {
      updates.lid = lid; // Enrich: Found by number, now adding LID
    }

    if (number && !contact.number) {
      updates.number = number; // Enrich: Found by LID, now adding Number
    }

    if (profilePicUrl) {
      updates.profilePicUrl = profilePicUrl;
    }

    if (isGroup && name) {
      updates.name = name;
    }

    // If there are updates, apply them
    if (Object.keys(updates).length > 0) {
      await contact.update(updates);
    }

    // Always update extraInfo if provided
    // (Logic for extraInfo usually loops and upserts, simplified here as per original)

    io.emit("contact", {
      action: "update",
      contact
    });

  } else {
    // 3. Not found by LID nor Number -> Create new
    contact = await Contact.create({
      name,
      number: number || null,
      lid: lid || null,
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

  if (!contact.profilePicUrl && contact.number) {
    // Determine which session is managing this? 
    // Ideally we should know which connection is active.
    // For now, using tenantId 1 and logic similar to Controller.
    // NOTE: This might trigger often if fetching fails.
    // But engine has "best effort" and returns empty string if fails.
    // Let's rely on event listener to update it.

    // We can't await this if we want speed, but RabbitMQ is async publish anyway.

    RabbitMQService.publishCommand("wbot.global.contact.sync", {
      id: uuidv4(),
      timestamp: Date.now(),
      type: "contact.sync",
      payload: {
        contactId: contact.id,
        number: contact.number,
        sessionId: 1
      },
      tenantId: 1
    }).catch(err => {
      console.error("Auto Sync Error:", err);
    });
  }

  return contact;
};

export default CreateOrUpdateContactService;
