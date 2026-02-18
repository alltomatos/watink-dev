import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import ensurePluginLicense from "../middleware/ensurePluginLicense";
import uploadConfig from "../config/upload";
import * as ProtocolController from "../controllers/ProtocolController";
import * as ProtocolPublicController from "../controllers/ProtocolPublicController";
import * as ProtocolKanbanController from "../controllers/ProtocolKanbanController";
import * as ProtocolAttachmentController from "../controllers/ProtocolAttachmentController";

const protocolRoutes = express.Router();
const upload = multer(uploadConfig);

protocolRoutes.get("/protocols/kanban", isAuth, ensurePluginLicense("helpdesk"), ProtocolKanbanController.index);
protocolRoutes.get("/protocols/dashboard", isAuth, ensurePluginLicense("helpdesk"), ProtocolController.dashboard);
protocolRoutes.get("/protocols", isAuth, ensurePluginLicense("helpdesk"), ProtocolController.index);
protocolRoutes.post("/protocols", isAuth, ensurePluginLicense("helpdesk"), ProtocolController.store);
protocolRoutes.get("/protocols/:protocolId", isAuth, ensurePluginLicense("helpdesk"), ProtocolController.show);
protocolRoutes.put("/protocols/:protocolId", isAuth, ensurePluginLicense("helpdesk"), upload.array("files", 10), ProtocolController.update);

// Attachment routes
protocolRoutes.get("/protocols/:protocolId/attachments", isAuth, ensurePluginLicense("helpdesk"), ProtocolAttachmentController.index);
protocolRoutes.post("/protocols/:protocolId/attachments", isAuth, ensurePluginLicense("helpdesk"), upload.array("files", 10), ProtocolAttachmentController.store);
protocolRoutes.delete("/protocols/:protocolId/attachments/:attachmentId", isAuth, ensurePluginLicense("helpdesk"), ProtocolAttachmentController.destroy);

// Public route for protocol checking
protocolRoutes.get("/public/protocols/:token", ProtocolPublicController.show);
protocolRoutes.get("/public/protocols/:token/attachments", ProtocolAttachmentController.publicIndex);

// Special route for creating protocol from contact drawer
protocolRoutes.post("/contacts/:contactId/protocols", isAuth, ensurePluginLicense("helpdesk"), ProtocolController.createFromContact);

export default protocolRoutes;

