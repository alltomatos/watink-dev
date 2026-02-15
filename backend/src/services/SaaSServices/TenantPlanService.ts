import TenantSubscription from "../../models/TenantSubscription";
import AppError from "../../errors/AppError";

interface PlanData {
  planName: string;
  pluginQuota: number;
  status?: string;
  expiresAt?: Date;
}

const updateTenantPlan = async (tenantId: string, data: PlanData): Promise<TenantSubscription> => {
  let sub = await TenantSubscription.findOne({ where: { tenantId } });

  if (!sub) {
    sub = await TenantSubscription.create({
      tenantId,
      ...data
    });
  } else {
    await sub.update(data);
  }

  return sub;
};

const getTenantPlan = async (tenantId: string): Promise<TenantSubscription> => {
  const sub = await TenantSubscription.findOne({ where: { tenantId } });
  if (!sub) {
    // Default plan if not found
    return TenantSubscription.build({
        tenantId,
        planName: "Start",
        pluginQuota: 4,
        status: "active"
    });
  }
  return sub;
};

export { updateTenantPlan, getTenantPlan };
