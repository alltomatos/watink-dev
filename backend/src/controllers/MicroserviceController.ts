import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import RabbitMQService from "../services/RabbitMQService";
import { Envelope } from "../microservice/contracts";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import AppError from "../errors/AppError";

export const sendButtons = async (req: Request, res: Response): Promise<Response> => {
    const { ticketId, text, footer, buttons, imageUrl } = req.body;
    const ticket = await ShowTicketService(ticketId);

    const command: Envelope = {
        id: uuidv4(),
        timestamp: Date.now(),
        tenantId: 1, // Assuming default tenant
        type: "message.send.buttons",
        payload: {
            sessionId: ticket.whatsappId,
            to: `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
            text,
            footer,
            buttons,
            imageUrl
        }
    };

    await RabbitMQService.publishCommand(`wbot.1.${ticket.whatsappId}.message.send.buttons`, command);
    return res.status(200).json({ message: "Command sent to queue" });
};

export const sendList = async (req: Request, res: Response): Promise<Response> => {
    const { ticketId, text, footer, buttonText, sections } = req.body;
    const ticket = await ShowTicketService(ticketId);

    const command: Envelope = {
        id: uuidv4(),
        timestamp: Date.now(),
        tenantId: 1,
        type: "message.send.list",
        payload: {
            sessionId: ticket.whatsappId,
            to: `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
            text,
            footer,
            buttonText,
            sections
        }
    };

    await RabbitMQService.publishCommand(`wbot.1.${ticket.whatsappId}.message.send.list`, command);
    return res.status(200).json({ message: "Command sent to queue" });
};

export const sendPoll = async (req: Request, res: Response): Promise<Response> => {
    const { ticketId, name, options, selectableCount } = req.body;
    const ticket = await ShowTicketService(ticketId);

    const command: Envelope = {
        id: uuidv4(),
        timestamp: Date.now(),
        tenantId: 1,
        type: "message.send.poll",
        payload: {
            sessionId: ticket.whatsappId,
            to: `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
            name,
            options,
            selectableCount
        }
    };

    await RabbitMQService.publishCommand(`wbot.1.${ticket.whatsappId}.message.send.poll`, command);
    return res.status(200).json({ message: "Command sent to queue" });
};

export const sendCarousel = async (req: Request, res: Response): Promise<Response> => {
    const { ticketId, text, footer, cards } = req.body;
    const ticket = await ShowTicketService(ticketId);

    const command: Envelope = {
        id: uuidv4(),
        timestamp: Date.now(),
        tenantId: 1,
        type: "message.send.carousel",
        payload: {
            sessionId: ticket.whatsappId,
            to: `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
            text,
            footer,
            cards
        }
    };

    await RabbitMQService.publishCommand(`wbot.1.${ticket.whatsappId}.message.send.carousel`, command);
    return res.status(200).json({ message: "Command sent to queue" });
};
