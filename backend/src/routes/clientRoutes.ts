import express from "express";
import isAuth from "../middleware/isAuth";
import * as ClientController from "../controllers/ClientController";

const clientRoutes = express.Router();

clientRoutes.get("/clients", isAuth, ClientController.index);
clientRoutes.post("/clients", isAuth, ClientController.store);
clientRoutes.get("/clients/:clientId", isAuth, ClientController.show);
clientRoutes.put("/clients/:clientId", isAuth, ClientController.update);
clientRoutes.delete("/clients/:clientId", isAuth, ClientController.remove);

export default clientRoutes;
