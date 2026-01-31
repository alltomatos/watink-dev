import dotenv from "dotenv";
dotenv.config();

export const config = {
  papiUrl: "", // set dynamically
  papiKey: "", // set dynamically
  webhookUrl: "", // set dynamically
  port: process.env.PORT || 3000,
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672",
    exchange: "wbot.commands"
  }
};
