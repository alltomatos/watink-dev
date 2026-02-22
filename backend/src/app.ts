import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import swaggerUi from "swagger-ui-express";
import swaggerDocs from "./config/swagger";

import "./database";
import uploadConfig from "./config/upload";
import AppError from "./errors/AppError";
import routes from "./routes";
import { logger } from "./utils/logger";
import PluginLoader from "./services/PluginServices/PluginLoader";

Sentry.init({ dsn: process.env.SENTRY_DSN });

const app = express();

let isReady = false;
export const setReady = () => { isReady = true; };

app.get("/health", (req, res) => {
  if (isReady) {
    return res.status(200).send("OK");
  }
  return res.status(503).send("Service Initializing");
});

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      callback(null, true);
    }
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use("/public", express.static(uploadConfig.directory));
app.use((req, res, next) => {
  console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.get("/test", async (req, res) => {
  try {
    const { Sequelize } = require("sequelize");
    const dbConfig = require("./config/database");
    const sequelize = new Sequelize(dbConfig);
    await sequelize.authenticate();
    res.send("Backend and Database are working!");
  } catch (err) {
    res.status(500).send("Backend is working, but Database is not reachable.");
  }
});

// Plugin Routes
const pluginRouter = PluginLoader.getInstance().getRouter();
app.use("/plugins/custom", pluginRouter);
app.use("/api/plugins/custom", pluginRouter);

// Backward/forward compatibility:
// - Legacy clients hit routes without prefix (/whatsapp)
// - New clients (frontend) hit /api/*
app.use(routes);
app.use("/api", routes);

app.use(Sentry.Handlers.errorHandler());

app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

export default app;
