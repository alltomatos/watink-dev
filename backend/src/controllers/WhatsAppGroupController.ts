import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import AppError from "../errors/AppError";
import WhatsAppGroup from "../models/WhatsAppGroup";
import WhatsAppGroupParticipant from "../models/WhatsAppGroupParticipant";
import Message from "../models/Message";
import Whatsapp from "../models/Whatsapp";
import RabbitMQService from "../services/RabbitMQService";
import { Envelope } from "../microservice/contracts";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;

  const groups = await WhatsAppGroup.findAll({
    where: { tenantId },
    attributes: ["groupJid", "subject", "participantsCount", "updatedAt"],
    order: [["updatedAt", "DESC"]]
  });

  const data = groups.map(g => ({
    id: g.groupJid,
    subject: g.subject,
    participantsCount: g.participantsCount,
    updatedAt: g.updatedAt
  }));

  return res.status(200).json(data);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { groupId } = req.params;

  const group = await WhatsAppGroup.findOne({
    where: { tenantId, groupJid: groupId }
  });

  if (!group) {
    throw new AppError("ERR_WA_GROUP_NOT_FOUND", 404);
  }

  return res.status(200).json(group);
};

export const participants = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { groupId } = req.params;

  const group = await WhatsAppGroup.findOne({ where: { tenantId, groupJid: groupId } });
  if (!group) {
    throw new AppError("ERR_WA_GROUP_NOT_FOUND", 404);
  }

  const rows = await WhatsAppGroupParticipant.findAll({
    where: { tenantId, groupId: group.id },
    attributes: ["participantJid", "participantName", "isAdmin", "isSuperAdmin", "updatedAt"],
    order: [["updatedAt", "DESC"]]
  });

  return res.status(200).json(rows);
};

export const sync = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { groupId } = req.params;

  const group = await WhatsAppGroup.findOne({ where: { tenantId, groupJid: groupId } });
  if (!group) {
    throw new AppError("ERR_WA_GROUP_NOT_FOUND", 404);
  }

  const whatsapp = await Whatsapp.findOne({ where: { id: group.whatsappId, tenantId } });
  if (!whatsapp || whatsapp.status !== "CONNECTED") {
    throw new AppError("ERR_WHATSAPP_NOT_CONNECTED", 400);
  }

  const command: Envelope = {
    id: uuidv4(),
    timestamp: Date.now(),
    tenantId,
    type: "contact.sync",
    payload: {
      sessionId: whatsapp.id,
      contactId: group.contactId || 0,
      number: group.groupJid,
      isGroup: true
    }
  };

  await RabbitMQService.publishCommand(
    RabbitMQService.generateRoutingKey(tenantId, whatsapp.engineType || "whaileys", whatsapp.id, "contact.sync"),
    command
  );

  await group.update({ lastSyncedAt: new Date() });

  return res.status(202).json({ message: "Group sync requested", groupId: group.groupJid });
};

export const messages = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { groupId } = req.params;
  const pageNumber = Number(req.query.pageNumber || 1);
  const limit = Number(req.query.limit || 20);
  const offset = limit * (pageNumber - 1);

  const group = await WhatsAppGroup.findOne({ where: { tenantId, groupJid: groupId } });
  if (!group) {
    throw new AppError("ERR_WA_GROUP_NOT_FOUND", 404);
  }

  const { count, rows } = await Message.findAndCountAll({
    where: { tenantId, isGroup: true, groupJid: groupId },
    attributes: [
      "id",
      "waMessageId",
      "body",
      "fromMe",
      "mediaType",
      "mediaUrl",
      "participantJid",
      "participantName",
      "ack",
      "createdAt"
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset
  });

  return res.status(200).json({
    count,
    hasMore: count > offset + rows.length,
    messages: rows.reverse()
  });
};
