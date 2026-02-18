import gracefulShutdown from "http-graceful-shutdown";
import app, { setReady } from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { EventListener } from "./services/WbotServices/EventListener";
import RabbitMQService from "./services/RabbitMQService";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { CommandListener } from "./services/WbotServices/CommandListener";
import FlowWorkerService from "./services/FlowServices/FlowWorkerService";
import PluginLoader from "./services/PluginServices/PluginLoader";
import WatinkCore from "./services/PluginServices/WatinkCore";

const startServer = async () => {
  await RabbitMQService.connect();

  const server = app.listen(process.env.PORT, () => {
    logger.info(`Server started on port: ${process.env.PORT}`);
  });

  initIO(server);

  // Initialize Plugins
  const loader = PluginLoader.getInstance();
  const core = new WatinkCore(loader.getRouter());
  await loader.init(core);

  await EventListener();
  await CommandListener();
  
  // Initialize Flow Engine Worker (Consumer)
  await FlowWorkerService.start();

  StartAllWhatsAppsSessions();
  
  setReady();

  gracefulShutdown(server);
};

startServer();
