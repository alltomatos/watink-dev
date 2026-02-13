import { CampaignRateLimitProfile } from "../../domain/campaign/types";

export class CampaignRateLimiter {
  constructor(private readonly profile: CampaignRateLimitProfile) {}

  canDispatch(_tenantId: string): boolean {
    // Placeholder: hook para Redis/token-bucket no futuro.
    // Sem efeito operacional nesta fase.
    return this.profile.maxPerMinute > 0 && this.profile.maxPerHour > 0;
  }
}

export default CampaignRateLimiter;
