import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as FlowController from "../controllers/FlowController";

const flowRoutes = Router();

flowRoutes.post("/flows/ai", isAuth, FlowController.generateFlowAI);
flowRoutes.post("/flows", isAuth, FlowController.store);
flowRoutes.get("/flows", isAuth, FlowController.index);
flowRoutes.get("/flows/:flowId", isAuth, FlowController.show);
flowRoutes.put("/flows/:flowId", isAuth, FlowController.update);

export default flowRoutes;
