export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

export type CampaignChannel = "whatsapp";

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  status: CampaignStatus;
  channel: CampaignChannel;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignDispatchRequest {
  campaignId: string;
  tenantId: string;
  contacts: Array<{ contactId: number; number: string }>;
  templateId?: string;
}

export interface CampaignRateLimitProfile {
  maxPerMinute: number;
  maxPerHour: number;
}
