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
import postgresVersionRoutes from "./postgresVersionRoutes";
import rabbitmqVersionRoutes from "./rabbitmqVersionRoutes";
import redisVersionRoutes from "./redisVersionRoutes";
import engineVersionRoutes from "./engineVersionRoutes";
import flowVersionRoutes from "./flowVersionRoutes";

import pipelineRoutes from "./pipelineRoutes";
import dealRoutes from "./dealRoutes";
import flowRoutes from "./flowRoutes";

import groupRoutes from "./groupRoutes";
import knowledgeRoutes from "./knowledgeRoutes";
import clientRoutes from "./clientRoutes";
import protocolRoutes from "./protocolRoutes";
import saasRoutes from "./saasRoutes";
import initialSetupRoutes from "./initialSetupRoutes";
import healthRoutes from "./healthRoutes";

import pluginRoutes from "./pluginRoutes";
import customPluginRoutes from "./customPluginRoutes";
import aiRoutes from "./aiRoutes";
import webchatRoutes from "./WebchatRoutes";

const routes = Router();

// Todas as rotas agora respondem exclusivamente sob o prefixo /v1/api
const v1Router = Router();

v1Router.use("/auth", authRoutes);
v1Router.use(settingRoutes);
v1Router.use(contactRoutes);
v1Router.use(ticketRoutes);
v1Router.use(whatsappRoutes);
v1Router.use(messageRoutes);
v1Router.use(whatsappSessionRoutes);
v1Router.use(queueRoutes);
v1Router.use(quickAnswerRoutes);
v1Router.use(apiRoutes);
v1Router.use(microserviceRoutes);
v1Router.use(tenantRoutes);
v1Router.use(groupRoutes);
v1Router.use("/version", versionRoutes);
v1Router.use(postgresVersionRoutes);
v1Router.use(rabbitmqVersionRoutes);
v1Router.use(redisVersionRoutes);
v1Router.use(engineVersionRoutes);
v1Router.use(flowVersionRoutes);
v1Router.use(pipelineRoutes);
v1Router.use(dealRoutes);
v1Router.use(flowRoutes);
v1Router.use(knowledgeRoutes);
v1Router.use(clientRoutes);
v1Router.use(protocolRoutes);
v1Router.use(saasRoutes);
v1Router.use(initialSetupRoutes);
v1Router.use(healthRoutes);
v1Router.use(pluginRoutes);
v1Router.use(customPluginRoutes);
v1Router.use(aiRoutes);
v1Router.use("/users", userRoutes);

// Aplica o prefixo único
routes.use("/v1/api", v1Router);

export default routes;
