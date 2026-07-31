/**
 * Extended provider operations for brand/campaign/number lifecycle (SF-019C).
 * Kept separate from the core SmsProvider send path so product layers stay
 * provider-neutral. Telnyx implementations remain flag-locked stubs.
 *
 * Provider-neutral map (SF-019C):
 *   Create/retrieve brand & campaign  → this interface
 *   Search/purchase/assign/suspend/release number → this interface
 *   Create messaging profile / fees / usage → this interface
 *   Send / retrieve message / inbound & delivery webhooks → SmsProvider
 *
 * Application layers must depend on these interfaces, not Telnyx field names.
 */

export interface BrandCreateRequest {
  workspaceId: string;
  legalEntityName: string;
  displayName: string;
  entityType: string;
  ein?: string | null;
  website: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  vertical: string;
}

export interface BrandRecord {
  providerBrandId: string;
  status: "submitted" | "pending" | "approved" | "rejected";
}

export interface CampaignCreateRequest {
  workspaceId: string;
  providerBrandId: string;
  usecase: string;
  description: string;
  sample1: string;
  sample2: string;
  messageFlow: string;
  helpMessage: string;
  optoutMessage: string;
}

export interface CampaignRecord {
  providerCampaignId: string;
  status: "submitted" | "pending" | "approved" | "rejected";
}

export interface NumberSearchRequest {
  areaCode?: string;
  numberType: "us-local" | "toll-free";
  limit?: number;
}

export interface NumberSearchResult {
  phoneE164: string;
  monthlyCostMicros: bigint;
}

export interface MessagingProfileRequest {
  name: string;
  webhookUrl: string;
}

export interface MessagingProfileRecord {
  providerProfileId: string;
}

export interface SmsProviderOps {
  createBrand(req: BrandCreateRequest): Promise<BrandRecord>;
  retrieveBrand(providerBrandId: string): Promise<BrandRecord>;
  createCampaign(req: CampaignCreateRequest): Promise<CampaignRecord>;
  retrieveCampaign(providerCampaignId: string): Promise<CampaignRecord>;
  searchNumbers(req: NumberSearchRequest): Promise<NumberSearchResult[]>;
  purchaseNumber(phoneE164: string, workspaceId: string): Promise<{
    phoneE164: string;
    providerNumberId: string;
    monthlyCostMicros: bigint;
  }>;
  assignNumber(providerNumberId: string, providerCampaignId: string): Promise<void>;
  createMessagingProfile(req: MessagingProfileRequest): Promise<MessagingProfileRecord>;
  retrieveFees(): Promise<{
    brandRegistrationMicros: bigint;
    campaignMonthlyMicros: bigint;
    numberMonthlyMicros: bigint;
  }>;
  retrieveUsage(_workspaceId: string, _period: string): Promise<{
    outboundSegments: number;
    inboundSegments: number;
    costMicros: bigint;
  }>;
  suspendNumber(providerNumberId: string): Promise<void>;
  releaseNumber(providerNumberId: string): Promise<void>;
}
