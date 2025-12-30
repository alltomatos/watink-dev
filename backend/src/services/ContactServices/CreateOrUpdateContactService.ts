import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import RabbitMQService from "../RabbitMQService";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import fs from "fs";
import path, { join } from "path";
import uploadConfig from "../../config/upload";
import { logger } from "../../utils/logger";

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

const downloadProfileImage = async ({
  profilePicUrl,
  tenantId,
  contactId
}: {
  profilePicUrl: string;
  tenantId: number | string;
  contactId: number;
}): Promise<string> => {
  const publicFolder = uploadConfig.directory;
  let filename = "";

  const folder = path.join(publicFolder, String(tenantId), "contacts");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    // fs.chmodSync(folder, 0o777); // Windows doesn't need chmod usually, can cause issues
  }

  const maxAttempts = 3;
  let attempt = 0;

  // Se já for local ou nula, retorna
  if (!profilePicUrl || profilePicUrl.includes("/public/") || profilePicUrl.endsWith("nopicture.png")) {
    return "";
  }

  while (attempt < maxAttempts) {
    try {
      const response = await axios.get(profilePicUrl, {
        responseType: "arraybuffer",
        timeout: 10000
      });

      // Tenta inferir extensão
      const contentType = response.headers["content-type"];
      let ext = "jpg";
      if (contentType) {
        if (contentType.includes("png")) ext = "png";
        if (contentType.includes("jpeg")) ext = "jpeg";
      }

      filename = `${new Date().getTime()}_${contactId}.${ext}`;
      fs.writeFileSync(join(folder, filename), response.data);

      return filename;
    } catch (error) {
      logger.error(`Download profile image failed attempt ${attempt + 1}: ${error}`);
      attempt++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return "";
};

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
    if (isGroup && name) updates.name = name;
    if (isGroup && !contact.isGroup) updates.isGroup = true;

    // Profile Picture logic with Download
    if (profilePicUrl && profilePicUrl !== contact.profilePicUrl) {
      const filename = await downloadProfileImage({
        profilePicUrl,
        tenantId,
        contactId: contact.id
      });
      if (filename) {
        updates.profilePicUrl = `${backendUrl}/public/${tenantId}/contacts/${filename}`;
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
      const filename = await downloadProfileImage({
        profilePicUrl,
        tenantId,
        contactId: contact.id
      });

      let finalUrl = profilePicUrl;
      if (filename) {
        finalUrl = `${backendUrl}/public/${tenantId}/contacts/${filename}`;
      }

      await contact.update({ profilePicUrl: finalUrl });
    }

    io.emit("contact", {
      action: "create",
      contact
    });
  }

  // Auto sync logic (Commented out to prevent infinite loops)
  // if (!contact.profilePicUrl && contact.number) {
  //   RabbitMQService.publishCommand("wbot.global.contact.sync", {
  //     id: uuidv4(),
  //     timestamp: Date.now(),
  //     type: "contact.sync",
  //     payload: {
  //       contactId: contact.id,
  //       number: contact.number,
  //       lid: contact.lid || undefined,
  //       sessionId: 1 
  //     },
  //     tenantId
  //   }).catch(err => {
  //     logger.warn("Auto Sync Error:", err);
  //   });
  // }

  return contact;
};

export default CreateOrUpdateContactService;
