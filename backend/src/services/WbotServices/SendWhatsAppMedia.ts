import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import formatBody from "../../helpers/Mustache";
import RabbitMQService from "../RabbitMQService";
import { Envelope } from "../../microservice/contracts";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<any> => {
  try {
    const hasBody = body
      ? formatBody(body as string, ticket.contact)
      : undefined;

    // Read file and convert to base64
    const fileData = fs.readFileSync(media.path, { encoding: "base64" });

    const command: Envelope = {
      id: uuidv4(),
      timestamp: Date.now(),
      tenantId: 1,
      type: "message.send.media",
      payload: {
        sessionId: ticket.whatsappId,
        to: `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
        caption: hasBody,
        media: {
          mimetype: media.mimetype,
          filename: media.filename,
          data: fileData
        }
      }
    };

    await RabbitMQService.publishCommand(
      `wbot.1.${ticket.whatsappId}.message.send.media`,
      command
    );

    await ticket.update({ lastMessage: body || media.filename });

    fs.unlinkSync(media.path);

    return { id: "pending" };
  } catch (err) {
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
