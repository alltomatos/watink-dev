import { Request, Response } from "express";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import StopWhatsAppSession from "../services/WbotServices/StopWhatsAppSession";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { usePairingCode, phoneNumber } = req.body;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  StartWhatsAppSession(whatsapp, usePairingCode, phoneNumber);

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { usePairingCode, phoneNumber } = req.body;

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    whatsappData: { session: "" }
  });

  StartWhatsAppSession(whatsapp, usePairingCode, phoneNumber);

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  await StopWhatsAppSession(whatsapp.id);

  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
