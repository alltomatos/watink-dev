import { v4 as uuidv4 } from "uuid";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import formatBody from "../../helpers/Mustache";
import RabbitMQService from "../RabbitMQService";
import { Envelope } from "../../microservice/contracts";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: any;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<any> => {
  try {
    const formattedBody = formatBody(body, ticket.contact);

    if (!ticket.whatsappId) {
      throw new AppError("ERR_TICKET_WRONG_WHATSAPP_ID");
    }

    const command: Envelope = {
      id: uuidv4(),
      timestamp: Date.now(),
      tenantId: ticket.tenantId,
      type: "message.send.text",
      payload: {
        sessionId: ticket.whatsappId,
        to: `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
        body: formattedBody,
        options: {
          quotedMsgId: quotedMsg?.id
        }
      }
    };

    await RabbitMQService.publishCommand(
      `wbot.${ticket.tenantId}.${ticket.whatsappId}.message.send.text`,
      command
    );

    await ticket.update({ lastMessage: body });

    // Return a mock or empty object as we are async now
    return { id: "pending", body: formattedBody };
  } catch (err) {
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
