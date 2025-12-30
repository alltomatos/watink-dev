// import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
// import { getWbot } from "../../libs/wbot";
import { logger } from "../../utils/logger";

/**
 * @deprecated This service relies on legacy local Wbot instance.
 * Use asynchronous validation via RabbitMQ and Engine events instead.
 */
const CheckContactNumber = async (number: string): Promise<string> => {
  logger.warn(`[DEPRECATED] CheckContactNumber called for ${number}. Returning input as fallback.`);
  return number;
};

export default CheckContactNumber;
