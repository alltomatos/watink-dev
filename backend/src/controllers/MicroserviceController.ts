import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import RabbitMQService from "../services/RabbitMQService";
import { Envelope } from "../microservice/contracts";
import ShowTicketService from "../services/TicketServices/ShowTicketService";

const getRouteParts = async (ticketId: number, tenantId: string | number) => {
  const ticket = await ShowTicketService(ticketId, tenantId);
  const contactNumber = ticket.contact.number.replace(/\D/g, "");
  const engineType = ticket.whatsapp?.engineType || "whaileys";
  const sessionId = ticket.whatsappId;
  const to = `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;

  return { ticket, engineType, sessionId, to };
};

export const sendButtons = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { ticketId, text, footer, buttons, imageUrl } = req.body;
  const { engineType, sessionId, to } = await getRouteParts(ticketId, tenantId);

  const command: Envelope = {
    id: uuidv4(),
    timestamp: Date.now(),
    tenantId,
    type: "message.send.buttons",
    payload: { sessionId, to, text, footer, buttons, imageUrl }
  };

  const routingKey = RabbitMQService.generateRoutingKey(tenantId, engineType, sessionId, "message.send.buttons");
  await RabbitMQService.publishCommand(routingKey, command);
  return res.status(200).json({ message: "Command sent to queue" });
};

export const sendList = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { ticketId, text, footer, buttonText, sections } = req.body;
  const { engineType, sessionId, to } = await getRouteParts(ticketId, tenantId);

  const command: Envelope = {
    id: uuidv4(),
    timestamp: Date.now(),
    tenantId,
    type: "message.send.list",
    payload: { sessionId, to, text, footer, buttonText, sections }
  };

  const routingKey = RabbitMQService.generateRoutingKey(tenantId, engineType, sessionId, "message.send.list");
  await RabbitMQService.publishCommand(routingKey, command);
  return res.status(200).json({ message: "Command sent to queue" });
};

export const sendPoll = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { ticketId, name, options, selectableCount } = req.body;
  const { engineType, sessionId, to } = await getRouteParts(ticketId, tenantId);

  const command: Envelope = {
    id: uuidv4(),
    timestamp: Date.now(),
    tenantId,
    type: "message.send.poll",
    payload: { sessionId, to, name, options, selectableCount }
  };

  const routingKey = RabbitMQService.generateRoutingKey(tenantId, engineType, sessionId, "message.send.poll");
  await RabbitMQService.publishCommand(routingKey, command);
  return res.status(200).json({ message: "Command sent to queue" });
};

export const sendCarousel = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { ticketId, text, footer, cards } = req.body;
  const { engineType, sessionId, to } = await getRouteParts(ticketId, tenantId);

  const command: Envelope = {
    id: uuidv4(),
    timestamp: Date.now(),
    tenantId,
    type: "message.send.carousel",
    payload: { sessionId, to, text, footer, cards }
  };

  const routingKey = RabbitMQService.generateRoutingKey(tenantId, engineType, sessionId, "message.send.carousel");
  await RabbitMQService.publishCommand(routingKey, command);
  return res.status(200).json({ message: "Command sent to queue" });
};
