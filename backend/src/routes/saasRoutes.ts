import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as SaaSController from "../controllers/SaaSController";
import * as PlanController from "../controllers/PlanController";

const saasRoutes = Router();

saasRoutes.get("/saas/tenants", isAuth, SaaSController.listTenants);
saasRoutes.get("/saas/tenants/:tenantId/plan", isAuth, SaaSController.getPlan);
saasRoutes.post("/saas/tenants/:tenantId/plan", isAuth, SaaSController.updatePlan);

// Plans management
saasRoutes.get("/saas/plans", isAuth, PlanController.listPlans);
saasRoutes.post("/saas/plans", isAuth, PlanController.createPlan);
saasRoutes.put("/saas/plans/:planId", isAuth, PlanController.updatePlan);
saasRoutes.delete("/saas/plans/:planId", isAuth, PlanController.deletePlan);

export default saasRoutes;
