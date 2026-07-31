/**
 * Deterministic mock implementation of SmsProviderOps for SF-019 E2E.
 * Never contacts Telnyx or any network.
 */

import { createHash } from "node:crypto";
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
import { MOCK_PROVIDER_COSTS } from "@/lib/sms/mock-provider";

function idFor(prefix: string, seed: string): string {
  return `${prefix}_${createHash("sha256").update(seed).digest("hex").slice(0, 16)}`;
}

const brands = new Map<string, BrandRecord>();
const campaigns = new Map<string, CampaignRecord>();
const suspended = new Set<string>();

export class MockSmsProviderOps implements SmsProviderOps {
  async createBrand(req: BrandCreateRequest): Promise<BrandRecord> {
    const providerBrandId = idFor("brand", `${req.workspaceId}:${req.legalEntityName}`);
    const rec: BrandRecord = { providerBrandId, status: "approved" };
    brands.set(providerBrandId, rec);
    return rec;
  }

  async retrieveBrand(providerBrandId: string): Promise<BrandRecord> {
    return brands.get(providerBrandId) ?? { providerBrandId, status: "pending" };
  }

  async createCampaign(req: CampaignCreateRequest): Promise<CampaignRecord> {
    const providerCampaignId = idFor("camp", `${req.workspaceId}:${req.providerBrandId}:${req.usecase}`);
    const rec: CampaignRecord = { providerCampaignId, status: "approved" };
    campaigns.set(providerCampaignId, rec);
    return rec;
  }

  async retrieveCampaign(providerCampaignId: string): Promise<CampaignRecord> {
    return campaigns.get(providerCampaignId) ?? { providerCampaignId, status: "pending" };
  }

  async searchNumbers(req: NumberSearchRequest): Promise<NumberSearchResult[]> {
    const area = (req.areaCode || "312").replace(/\D/g, "").slice(0, 3) || "312";
    const limit = Math.min(req.limit ?? 3, 5);
    const out: NumberSearchResult[] = [];
    for (let i = 0; i < limit; i++) {
      const line = String(5550100 + i).padStart(7, "0");
      out.push({
        phoneE164: `+1${area}${line}`,
        monthlyCostMicros: MOCK_PROVIDER_COSTS.numberMonthlyMicros,
      });
    }
    return out;
  }

  async purchaseNumber(phoneE164: string, workspaceId: string) {
    return {
      phoneE164,
      providerNumberId: idFor("num", `${workspaceId}:${phoneE164}`),
      monthlyCostMicros: MOCK_PROVIDER_COSTS.numberMonthlyMicros,
    };
  }

  async assignNumber(_providerNumberId: string, _providerCampaignId: string): Promise<void> {
    return;
  }

  async createMessagingProfile(req: MessagingProfileRequest): Promise<MessagingProfileRecord> {
    return { providerProfileId: idFor("prof", req.name + req.webhookUrl) };
  }

  async retrieveFees() {
    return {
      brandRegistrationMicros: 4_500_000n,
      campaignMonthlyMicros: MOCK_PROVIDER_COSTS.campaignMonthlyMicros,
      numberMonthlyMicros: MOCK_PROVIDER_COSTS.numberMonthlyMicros,
    };
  }

  async retrieveUsage(_workspaceId: string, _period: string) {
    return { outboundSegments: 0, inboundSegments: 0, costMicros: 0n };
  }

  async suspendNumber(providerNumberId: string): Promise<void> {
    suspended.add(providerNumberId);
  }

  async releaseNumber(providerNumberId: string): Promise<void> {
    suspended.delete(providerNumberId);
  }

  /** Test helper */
  isSuspended(providerNumberId: string): boolean {
    return suspended.has(providerNumberId);
  }

  reset(): void {
    brands.clear();
    campaigns.clear();
    suspended.clear();
  }
}

export const mockSmsProviderOps = new MockSmsProviderOps();
