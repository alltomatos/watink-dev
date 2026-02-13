import { CampaignDispatchRequest } from "../../domain/campaign/types";
import ICampaignQueueAdapter from "./ICampaignQueueAdapter";
import CampaignRateLimiter from "./CampaignRateLimiter";

interface Request {
  dispatch: CampaignDispatchRequest;
  rateLimiter: CampaignRateLimiter;
  queueAdapter: ICampaignQueueAdapter;
}

export const CampaignOrchestratorService = async ({
  dispatch,
  rateLimiter,
  queueAdapter
}: Request): Promise<{ accepted: boolean; reason?: string }> => {
  if (!rateLimiter.canDispatch(dispatch.tenantId)) {
    return { accepted: false, reason: "RATE_LIMIT_BLOCKED" };
  }

  await queueAdapter.enqueueDispatch(dispatch);
  return { accepted: true };
};

export default CampaignOrchestratorService;
