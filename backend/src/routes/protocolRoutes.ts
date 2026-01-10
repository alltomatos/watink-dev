import express from "express";
import isAuth from "../middleware/isAuth";
import * as ProtocolController from "../controllers/ProtocolController";
import * as ProtocolPublicController from "../controllers/ProtocolPublicController";

const protocolRoutes = express.Router();

protocolRoutes.get("/protocols", isAuth, ProtocolController.index);
protocolRoutes.post("/protocols", isAuth, ProtocolController.store);
protocolRoutes.get("/protocols/:protocolId", isAuth, ProtocolController.show);
protocolRoutes.put("/protocols/:protocolId", isAuth, ProtocolController.update);

// Public route for protocol checking
protocolRoutes.get("/public/protocols/:token", ProtocolPublicController.show);

// Special route for creating protocol from contact drawer
protocolRoutes.post("/contacts/:contactId/protocols", isAuth, ProtocolController.createFromContact);

export default protocolRoutes;
