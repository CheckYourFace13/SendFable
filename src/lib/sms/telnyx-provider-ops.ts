/**
 * Telnyx SmsProviderOps — inactive stub. Never calls the network until
 * credentials exist AND live flags are enabled. Used only after mock is off.
 */

import type {
  BrandCreateRequest,
  BrandRecord,
  CampaignCreateRequest,
  CampaignRecord,
  MessagingProfileRequest,
  MessagingProfileRecord,
  NumberSearchRequest,
  NumberSearchResult,
  SmsProviderOps,
} from "@/lib/sms/provider-ops";

function notConfigured(): never {
  throw new Error(
    "Telnyx provider ops are not configured (credentials missing or live flags off)"
  );
}

export class TelnyxSmsProviderOps implements SmsProviderOps {
  async createBrand(_req: BrandCreateRequest): Promise<BrandRecord> {
    return notConfigured();
  }
  async retrieveBrand(_id: string): Promise<BrandRecord> {
    return notConfigured();
  }
  async createCampaign(_req: CampaignCreateRequest): Promise<CampaignRecord> {
    return notConfigured();
  }
  async retrieveCampaign(_id: string): Promise<CampaignRecord> {
    return notConfigured();
  }
  async searchNumbers(_req: NumberSearchRequest): Promise<NumberSearchResult[]> {
    return notConfigured();
  }
  async purchaseNumber(_phone: string, _workspaceId: string) {
    return notConfigured();
  }
  async assignNumber(_numberId: string, _campaignId: string): Promise<void> {
    return notConfigured();
  }
  async createMessagingProfile(_req: MessagingProfileRequest): Promise<MessagingProfileRecord> {
    return notConfigured();
  }
  async retrieveFees() {
    return notConfigured();
  }
  async retrieveUsage(_workspaceId: string, _period: string) {
    return notConfigured();
  }
  async suspendNumber(_id: string): Promise<void> {
    return notConfigured();
  }
  async releaseNumber(_id: string): Promise<void> {
    return notConfigured();
  }
}
