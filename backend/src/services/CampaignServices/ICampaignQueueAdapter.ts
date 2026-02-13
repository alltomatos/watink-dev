import { CampaignDispatchRequest } from "../../domain/campaign/types";

export interface ICampaignQueueAdapter {
  enqueueDispatch(request: CampaignDispatchRequest): Promise<void>;
}

export default ICampaignQueueAdapter;
