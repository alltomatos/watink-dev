import express from "express";
import isAuth from "../middleware/isAuth";
import * as ProtocolController from "../controllers/ProtocolController";

const protocolRoutes = express.Router();

protocolRoutes.get("/protocols", isAuth, ProtocolController.index);
protocolRoutes.post("/protocols", isAuth, ProtocolController.store);
protocolRoutes.get("/protocols/:protocolId", isAuth, ProtocolController.show);
protocolRoutes.put("/protocols/:protocolId", isAuth, ProtocolController.update);

// Special route for creating protocol from contact drawer
protocolRoutes.post("/contacts/:contactId/protocols", isAuth, ProtocolController.createFromContact);

export default protocolRoutes;
