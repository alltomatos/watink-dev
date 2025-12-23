import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import StopWhatsAppSession from "../WbotServices/StopWhatsAppSession";

const DeleteWhatsAppService = async (id: string): Promise<void> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id }
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  await StopWhatsAppSession(whatsapp.id); // [NEW] Ensure session is stopped in engine
  await whatsapp.destroy();
};

export default DeleteWhatsAppService;
