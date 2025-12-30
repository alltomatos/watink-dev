import AppError from "../../errors/AppError";
// import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
// import { getWbot } from "../../libs/wbot";
import { logger } from "../../utils/logger";

/**
 * @deprecated This service relies on legacy local Wbot instance.
 * Use asynchronous validation via RabbitMQ and Engine events instead.
 */
const CheckIsValidContact = async (number: string): Promise<void> => {
  logger.warn(`[DEPRECATED] CheckIsValidContact called for ${number}. This function is a no-op in Microservices mode.`);
  // No-op to prevent breaking legacy calls that haven't been removed yet, 
  // but logic should be moved to Engine.
  return;
};

export default CheckIsValidContact;
