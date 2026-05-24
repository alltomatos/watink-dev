import { Router } from "express";
import * as InitialSetupController from "../controllers/InitialSetupController";

const initialSetupRoutes = Router();

initialSetupRoutes.get("/initial-setup/check", InitialSetupController.check);
initialSetupRoutes.post("/initial-setup", InitialSetupController.setup);

export default initialSetupRoutes;
