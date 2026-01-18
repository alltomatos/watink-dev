import dotenv from "dotenv";
import { RabbitMQ } from "./rabbitmq";
import { WebchatHandler } from "./handler";
import { logger } from "./logger";
import { startHttpServer } from "./http";

dotenv.config();

const AMQP_URL = process.env.AMQP_URL || "amqp://guest:guest@localhost:5672";

const start = async () => {
    logger.info("Starting Webchat Engine...");
    logger.info(`Connecting to RabbitMQ at ${AMQP_URL.replace(/\/\/.*@/, "//***@")}`);

    // Inicia servidor HTTP para endpoint de versão
    startHttpServer();

    const rabbitmq = new RabbitMQ(AMQP_URL);
    await rabbitmq.connect();

    const handler = new WebchatHandler(rabbitmq);

    await rabbitmq.consumeCommands(async (msg) => {
        await handler.handleCommand(msg);
    });

    logger.info("Webchat Worker running and listening for commands.");
};

start().catch((err) => {
    logger.error("Fatal error starting webchat worker", err);
    process.exit(1);
});
