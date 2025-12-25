import "./bootstrap";
import "reflect-metadata";
import "./database";
import RabbitMQService from "./services/RabbitMQService";
import FlowWorkerService from "./services/FlowServices/FlowWorkerService";
import { logger } from "./utils/logger";

const startWorker = async () => {
  logger.info("Starting Flow Engine Worker...");

  try {
    // Connect to RabbitMQ
    await RabbitMQService.connect();
    
    // Start Worker Consumer
    await FlowWorkerService.start();
    
    logger.info("Flow Engine Worker is running!");

    // Keep process alive
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received. Shutting down worker...");
      process.exit(0);
    });

  } catch (err) {
    logger.error(`Fatal Error in Flow Worker: ${err}`);
    process.exit(1);
  }
};

startWorker();
