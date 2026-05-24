import { Request, Response } from "express";
import Plan from "../models/Plan";
import AppError from "../errors/AppError";

export const listPlans = async (req: Request, res: Response): Promise<Response> => {
  const plans = await Plan.findAll();
  return res.json(plans);
};

export const createPlan = async (req: Request, res: Response): Promise<Response> => {
  const { name, pluginQuota, price, active } = req.body;
  const plan = await Plan.create({ name, pluginQuota, price, active });
  return res.json(plan);
};

export const updatePlan = async (req: Request, res: Response): Promise<Response> => {
  const { planId } = req.params;
  const { name, pluginQuota, price, active } = req.body;
  
  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  await plan.update({ name, pluginQuota, price, active });
  return res.json(plan);
};

export const deletePlan = async (req: Request, res: Response): Promise<Response> => {
  const { planId } = req.params;
  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("Plan not found", 404);
  }
  await plan.destroy();
  return res.json({ message: "Plan deleted" });
};
