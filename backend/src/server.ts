import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import RabbitMQService from "./services/RabbitMQService";

const startServer = async () => {
  await RabbitMQService.connect();

  const server = app.listen(process.env.PORT, () => {
    logger.info(`Server started on port: ${process.env.PORT}`);
  });

  initIO(server);
  StartAllWhatsAppsSessions();
  gracefulShutdown(server);
};

startServer();
