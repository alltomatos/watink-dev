import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
// import RabbitMQService from "../RabbitMQService";
// import { v4 as uuidv4 } from "uuid";
// import axios from "axios";
// import fs from "fs";
// import path, { join } from "path";
// import uploadConfig from "../../config/upload";
import { DownloadProfileImage } from "../../helpers/DownloadProfileImage";

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

  // 1. Try to find by LID first
  if (lid) {
    contact = await Contact.findOne({ where: { lid, tenantId } });
  }

  // 2. If not found by LID, try to find by Number
  if (!contact && number) {
    contact = await Contact.findOne({ where: { number, tenantId } });
  }

  // 3. Fallback: Try to find by Name
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
      updates.name = name; // Individual contacts usually don't have this issue
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
    }

    io.emit("contact", {
      action: "create",
      contact
    });
  }

  return contact;
};

export default CreateOrUpdateContactService;
