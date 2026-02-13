import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { logger } from "../../utils/logger";

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  const whatsapps = await ListWhatsAppsService();
  if (whatsapps.length === 0) return;

  const results = await Promise.allSettled(
    whatsapps.map((whatsapp) => StartWhatsAppSession(whatsapp))
  );

  results.forEach((result, idx) => {
    if (result.status === "rejected") {
      logger.warn(
        `StartAllWhatsAppsSessions: failed to start session ${whatsapps[idx]?.id}: ${result.reason?.message || result.reason}`
      );
    }
  });
};
