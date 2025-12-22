import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { EventListener } from "./services/WbotServices/EventListener";
import RabbitMQService from "./services/RabbitMQService";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { CommandListener } from "./services/WbotServices/CommandListener";

const startServer = async () => {
  await RabbitMQService.connect();

  const server = app.listen(process.env.PORT, () => {
    logger.info(`Server started on port: ${process.env.PORT}`);
  });

  initIO(server);
  await EventListener();
  await CommandListener();
  StartAllWhatsAppsSessions();
  gracefulShutdown(server);
};

startServer();
