import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
// import RabbitMQService from "../RabbitMQService";
// import { v4 as uuidv4 } from "uuid";
// import axios from "axios";
// import fs from "fs";
// import path, { join } from "path";
// import uploadConfig from "../../config/upload";
import { DownloadProfileImage } from "../../helpers/DownloadProfileImage";
import MergeContactsService from "./MergeContactsService";

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
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = [],
  lid,
  tenantId = 1
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber?.replace(/[^0-9]/g, "");
  const io = getIO();
  let contact: Contact | null = null;
  const backendUrl = process.env.URL_BACKEND || process.env.BACKEND_URL || "http://localhost:8080";

  // 1. Try to find by LID
  if (lid) {
    contact = await Contact.findOne({ where: { lid, tenantId } });
  }

  // 2. Try to find by Number (only if valid number)
  let contactByNumber: Contact | null = null;
  if (number) {
    contactByNumber = await Contact.findOne({ where: { number, tenantId } });
  }

  // 3. Merge Logic
  if (contact && contactByNumber) {
    if (contact.id === contactByNumber.id) {
      // Same contact found by both ways
    } else {
      // Merge: Prefer contactByNumber (Target), delete contact (Origin - LID-only)
      // Ensure Target has the LID
      if (!contactByNumber.lid && contact.lid) {
        await contactByNumber.update({ lid: contact.lid });
      }

      await MergeContactsService({
        contactIdOrigin: contact.id,
        contactIdTarget: contactByNumber.id,
        tenantId
      });

      contact = contactByNumber;
    }
  } else if (!contact && contactByNumber) {
    contact = contactByNumber;
  }

  // 4. Fallback: Try to find by Name (if still no contact)
  if (!contact && !number && !lid && name) {
    contact = await Contact.findOne({ where: { name, tenantId } });
  }

  if (contact) {
    // Update existing contact
    const updates: any = {};

    if (lid && !contact.lid) updates.lid = lid;
    if (number && !contact.number) updates.number = number;

    // Prevent overwriting group name with JID
    if (isGroup && name) {
      const newNameIsJid = name.includes("@g.us");
      const currentNameIsJid = contact.name?.includes("@g.us") || contact.name === contact.number;

      if (!newNameIsJid || currentNameIsJid) {
        updates.name = name;
      }
    } else if (name) {
      // Individual Contact: Prioritize PushName/Notify if available, OR if current name is placeholder
      // If the new name is just a number, ignore it if we already have a text name
      const newNameIsNumber = name.replace(/\D/g, "") === name || name.includes("@");
      const currentNameIsNumber = contact.name.replace(/\D/g, "") === contact.name || contact.name.includes("@");

      if (!newNameIsNumber || currentNameIsNumber) {
        updates.name = name;
      }
    }

    if (isGroup && !contact.isGroup) updates.isGroup = true;

    // Profile Picture logic with Download
    if (profilePicUrl && profilePicUrl !== contact.profilePicUrl) {
      const filename = await DownloadProfileImage({
        profilePicUrl,
        tenantId,
        contactId: contact.id
      });
      if (filename) {
        // Cache busting: Add version param to force frontend update
        updates.profilePicUrl = `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`;
      } else if (profilePicUrl) {
        // Fallback to remote URL if download failed
        updates.profilePicUrl = profilePicUrl;
      }
    }

    if (Object.keys(updates).length > 0) {
      await contact.update(updates);
      await contact.reload();
    }

    io.emit("contact", {
      action: "update",
      contact
    });

  } else {
    // Create new contact
    contact = await Contact.create({
      name,
      number: number || null,
      lid: lid || null,
      profilePicUrl: "", // Will update after creation to have ID for filename
      email,
      isGroup,
      extraInfo,
      tenantId
    });

    if (profilePicUrl) {
      const filename = await DownloadProfileImage({
        profilePicUrl,
        tenantId,
        contactId: contact.id
      });

      let finalUrl = profilePicUrl;
      if (filename) {
        // Cache busting
        finalUrl = `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`;
      }

      await contact.update({ profilePicUrl: finalUrl });
      await contact.reload();
    }

    io.emit("contact", {
      action: "create",
      contact
    });
  }

  return contact;
};

export default CreateOrUpdateContactService;
