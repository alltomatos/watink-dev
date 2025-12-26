import { v4 as uuidv4 } from "uuid";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import formatBody from "../../helpers/Mustache";
import RabbitMQService from "../RabbitMQService";
import { Envelope, SendButtonsPayload, SendListPayload } from "../../microservice/contracts";

interface Request {
    body: string;
    ticket: Ticket;
    buttons?: Array<{ label: string; id: string }>;
    list?: {
        title: string;
        description?: string;
        buttonText: string;
        sections: Array<{
            title: string;
            rows: Array<{
                id: string;
                title: string;
                description?: string;
            }>;
        }>;
    };
}

const SendWhatsAppInteractive = async ({
    body,
    ticket,
    buttons,
    list
}: Request): Promise<any> => {
    try {
        const formattedBody = formatBody(body, ticket.contact);
        const id = uuidv4();
        const sessionId = ticket.whatsappId;
        const to = `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`;

        let command: Envelope;
        let routingKey = "";

        if (buttons && buttons.length > 0) {
            const payload: SendButtonsPayload = {
                sessionId,
                to,
                text: formattedBody,
                buttons: buttons.map(b => ({
                    buttonId: b.id,
                    buttonText: b.label
                }))
            };

            command = {
                id,
                timestamp: Date.now(),
                tenantId: ticket.tenantId,
                type: "message.send.buttons",
                payload
            };

            routingKey = `wbot.1.${sessionId}.message.send.buttons`;
        } else if (list) {
            const payload: SendListPayload = {
                sessionId,
                to,
                text: formattedBody,
                buttonText: list.buttonText || "Opções",
                sections: list.sections.map(s => ({
                    title: s.title,
                    rows: s.rows.map(r => ({
                        rowId: r.id,
                        title: r.title,
                        description: r.description
                    }))
                }))
            };

            command = {
                id,
                timestamp: Date.now(),
                tenantId: ticket.tenantId,
                type: "message.send.list",
                payload
            };

            routingKey = `wbot.1.${sessionId}.message.send.list`;
        } else {
            throw new Error("Invalid interactive message: must have buttons or list");
        }

        await RabbitMQService.publishCommand(routingKey, command);

        await ticket.update({ lastMessage: body });

        return { id: "pending", body: formattedBody };
    } catch (err) {
        throw new AppError("ERR_SENDING_WAPP_INTERACTIVE");
    }
};

export default SendWhatsAppInteractive;
