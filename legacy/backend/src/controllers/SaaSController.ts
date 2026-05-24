import { Request, Response } from "express";
import { getTenantPlan, updateTenantPlan } from "../services/SaaSServices/TenantPlanService";
import Tenant from "../models/Tenant";

export const listTenants = async (req: Request, res: Response): Promise<Response> => {
  const tenants = await Tenant.findAll({
    include: ["owner"] // Assumindo que a associação existe ou ajustaremos
  });
  return res.json(tenants);
};

export const getPlan = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.params;
  const plan = await getTenantPlan(tenantId);
  return res.json(plan);
};

export const updatePlan = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.params;
  const { planName, pluginQuota, status, expiresAt } = req.body;
  
  const plan = await updateTenantPlan(tenantId, {
    planName,
    pluginQuota,
    status,
    expiresAt
  });
  
  return res.json(plan);
};
