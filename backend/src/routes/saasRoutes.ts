import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as SaaSController from "../controllers/SaaSController";

const saasRoutes = Router();

saasRoutes.get("/saas/tenants", isAuth, SaaSController.listTenants);
saasRoutes.get("/saas/tenants/:tenantId/plan", isAuth, SaaSController.getPlan);
saasRoutes.post("/saas/tenants/:tenantId/plan", isAuth, SaaSController.updatePlan);

export default saasRoutes;
