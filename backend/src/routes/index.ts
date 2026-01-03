import { Router } from "express";

import userRoutes from "./userRoutes";
import authRoutes from "./authRoutes";
import settingRoutes from "./settingRoutes";
import contactRoutes from "./contactRoutes";
import ticketRoutes from "./ticketRoutes";
import whatsappRoutes from "./whatsappRoutes";
import messageRoutes from "./messageRoutes";
import whatsappSessionRoutes from "./whatsappSessionRoutes";
import queueRoutes from "./queueRoutes";
import quickAnswerRoutes from "./quickAnswerRoutes";
import apiRoutes from "./apiRoutes";
import microserviceRoutes from "./microserviceRoutes";
import tenantRoutes from "./tenantRoutes";
import versionRoutes from "./versionRoutes";

import pipelineRoutes from "./pipelineRoutes";
import dealRoutes from "./dealRoutes";
import flowRoutes from "./flowRoutes";

import groupRoutes from "./groupRoutes";
import knowledgeRoutes from "./knowledgeRoutes";
import clientRoutes from "./clientRoutes";
import protocolRoutes from "./protocolRoutes";

const routes = Router();

// routes.use(userRoutes); // Moved to bottom
routes.use("/auth", authRoutes);
routes.use(settingRoutes);
routes.use(contactRoutes);
routes.use(ticketRoutes);
routes.use(whatsappRoutes);
routes.use(messageRoutes);
routes.use(whatsappSessionRoutes);
routes.use(queueRoutes);
routes.use(quickAnswerRoutes);
routes.use(apiRoutes);
routes.use(microserviceRoutes);
routes.use(tenantRoutes);
routes.use(groupRoutes);
routes.use("/version", versionRoutes);
routes.use(pipelineRoutes);
routes.use(dealRoutes);
routes.use(flowRoutes);
routes.use(knowledgeRoutes);
routes.use(clientRoutes);
routes.use(protocolRoutes);
routes.use("/users", userRoutes);

export default routes;
