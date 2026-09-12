/**
 * Telnyx SmsProviderOps — real 10DLC brand/campaign/number lifecycle.
 * Network calls only when credentials exist. Registration/number flags gate
 * callers; this class does not flip public SMS on by itself.
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
import { MOCK_PROVIDER_COSTS } from "@/lib/sms/mock-provider";

const TELNYX_API_BASE = "https://api.telnyx.com/v2";

function apiKey(): string {
  const k = process.env.TELNYX_API_KEY?.trim();
  if (!k) throw new Error("TELNYX_API_KEY is not configured");
  return k;
}

function messagingProfileId(): string | null {
  return process.env.TELNYX_MESSAGING_PROFILE_ID?.trim() || null;
}

function redact(s: string): string {
  return s
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/KEY[A-Z0-9_]{8,}/gi, "[redacted]")
    .slice(0, 400);
}

async function telnyxJson<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${TELNYX_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Telnyx ${method} ${path} → HTTP ${res.status}: ${redact(text)}`);
  }
  if (!res.ok) {
    const detail = redact(JSON.stringify(json?.errors || json || text));
    throw new Error(`Telnyx ${method} ${path} → HTTP ${res.status}: ${detail}`);
  }
  return json as T;
}

function mapBrandStatus(raw: string | null | undefined): BrandRecord["status"] {
  const s = (raw || "").toUpperCase();
  // Pending / under review — NOT failures. Campaign must wait for VERIFIED.
  if (
    !s ||
    s === "PENDING" ||
    s === "SELF_DECLARED" ||
    s === "UNVERIFIED" ||
    s.includes("PENDING") ||
    s.includes("REVIEW")
  ) {
    return "pending";
  }
  if (s.includes("FAIL") || s.includes("REJECT")) return "rejected";
  if (s === "VERIFIED" || s === "APPROVED" || s === "VETTED_VERIFIED" || s === "OK") {
    return "approved";
  }
  return "submitted";
}

function mapCampaignStatus(raw: string | null | undefined): CampaignRecord["status"] {
  const s = (raw || "").toUpperCase();
  if (s.includes("REJECT") || s.includes("FAIL") || s === "EXPIRED") return "rejected";
  if (s === "ACTIVE" || s === "APPROVED" || s === "ACCEPTED") return "approved";
  if (s === "PENDING" || s.includes("PENDING") || !s) return "pending";
  return "submitted";
}

function dollarsToMicros(v: string | number | null | undefined): bigint {
  if (v == null || v === "") return MOCK_PROVIDER_COSTS.numberMonthlyMicros;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return MOCK_PROVIDER_COSTS.numberMonthlyMicros;
  return BigInt(Math.round(n * 1_000_000));
}

export class TelnyxSmsProviderOps implements SmsProviderOps {
  async createBrand(req: BrandCreateRequest): Promise<BrandRecord> {
    const payload: Record<string, unknown> = {
      entityType: req.entityType,
      displayName: req.displayName,
      companyName: req.legalEntityName,
      country: req.country || "US",
      email: req.email,
      phone: req.phone,
      street: req.street,
      city: req.city,
      state: req.state,
      postalCode: req.postalCode,
      website: req.website,
      vertical: req.vertical,
    };
    if (req.ein?.trim()) {
      // Telnyx accepts XX-XXXXXXX or 9 digits; keep digits with optional hyphen
      const cleaned = req.ein.replace(/[^\d-]/g, "");
      payload.ein = cleaned;
    }

    const res = await telnyxJson<{ data?: any } & Record<string, unknown> >(
      "POST",
      "/10dlc/brand",
      payload
    );
    const data = (res as any).data ?? res;
    const brandId = String(data.brandId || data.id || "");
    if (!brandId) throw new Error("Telnyx createBrand returned no brandId");
    return {
      providerBrandId: brandId,
      status: mapBrandStatus(data.identityStatus || data.status),
    };
  }

  async retrieveBrand(providerBrandId: string): Promise<BrandRecord> {
    const res = await telnyxJson<{ data?: any }>(
      "GET",
      `/10dlc/brand/${encodeURIComponent(providerBrandId)}`
    );
    const data = res.data ?? res;
    const failureReason =
      (data as any).failureReasons ||
      (data as any).rejectionReason ||
      (data as any).statusReason ||
      null;
    return {
      providerBrandId: String((data as any).brandId || (data as any).id || providerBrandId),
      status: mapBrandStatus((data as any).identityStatus || (data as any).status),
      failureReason: failureReason
        ? typeof failureReason === "string"
          ? failureReason
          : JSON.stringify(failureReason).slice(0, 2000)
        : null,
    };
  }

  async listBrands(): Promise<
    Array<{
      providerBrandId: string;
      companyName: string | null;
      displayName: string | null;
      status: BrandRecord["status"];
      website: string | null;
      failureReason?: string | null;
    }>
  > {
    const res = await telnyxJson<{ data?: any[] }>("GET", "/10dlc/brand?page[size]=50");
    const rows = Array.isArray(res.data) ? res.data : [];
    return rows.map((raw) => {
      const d = (raw as any).attributes || raw;
      const failureReason = d.failureReasons || d.rejectionReason || null;
      return {
        providerBrandId: String(d.brandId || d.id || raw.id || ""),
        companyName: d.companyName ? String(d.companyName) : null,
        displayName: d.displayName ? String(d.displayName) : null,
        status: mapBrandStatus(d.identityStatus || d.status),
        website: d.website ? String(d.website) : null,
        failureReason: failureReason
          ? typeof failureReason === "string"
            ? failureReason
            : JSON.stringify(failureReason).slice(0, 2000)
          : null,
      };
    });
  }

  async createCampaign(req: CampaignCreateRequest): Promise<CampaignRecord> {
    // Provider-side guard: never call campaignBuilder while brand is pending/failed.
    const brand = await this.retrieveBrand(req.providerBrandId);
    if (brand.status !== "approved") {
      const { BrandNotVerifiedError } = await import("@/lib/sms/registration-lifecycle");
      throw new BrandNotVerifiedError(
        `brand_not_verified (provider status=${brand.status})`
      );
    }

    const payload = {
      brandId: req.providerBrandId,
      usecase: req.usecase || "MARKETING",
      description: req.description,
      sample1: req.sample1,
      sample2: req.sample2,
      messageFlow: req.messageFlow,
      helpMessage: req.helpMessage,
      optoutMessage: req.optoutMessage,
      optinKeywords: "START, YES, SUBSCRIBE",
      optoutKeywords: "STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT",
      helpKeywords: "HELP, INFO",
      subscriberOptin: true,
      subscriberOptout: true,
      subscriberHelp: true,
      embeddedLink: true,
      embeddedPhone: false,
      numberPool: false,
      ageGated: false,
      directLending: false,
    };

    // Official path is campaignBuilder; fall back to legacy if needed.
    let res: any;
    try {
      res = await telnyxJson("POST", "/10dlc/campaignBuilder", payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404") || msg.includes("10005")) {
        res = await telnyxJson("POST", "/10dlc/campaign", payload);
      } else {
        throw err;
      }
    }

    const data = res.data ?? res;
    const campaignId = String(
      data.campaignId || data.id || data.tcrCampaignId || data.campaign_id || ""
    );
    if (!campaignId) throw new Error("Telnyx createCampaign returned no campaignId");
    return {
      providerCampaignId: campaignId,
      status: mapCampaignStatus(data.status || data.campaignStatus),
    };
  }

  async retrieveCampaign(providerCampaignId: string): Promise<CampaignRecord> {
    // Prefer qualified GET; try a few known shapes.
    const paths = [
      `/10dlc/campaign/${encodeURIComponent(providerCampaignId)}`,
      `/10dlc/campaignBuilder/${encodeURIComponent(providerCampaignId)}`,
    ];
    let lastErr: Error | null = null;
    for (const path of paths) {
      try {
        const res = await telnyxJson<{ data?: any }>("GET", path);
        const data = res.data ?? res;
        const failureReason =
          (data as any).rejectionReason ||
          (data as any).failureReasons ||
          (data as any).statusReason ||
          null;
        return {
          providerCampaignId: String(
            (data as any).campaignId || (data as any).id || providerCampaignId
          ),
          status: mapCampaignStatus((data as any).status || (data as any).campaignStatus),
          failureReason: failureReason
            ? typeof failureReason === "string"
              ? failureReason
              : JSON.stringify(failureReason).slice(0, 2000)
            : null,
        };
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
    }
    throw lastErr ?? new Error("retrieveCampaign failed");
  }

  async searchNumbers(req: NumberSearchRequest): Promise<NumberSearchResult[]> {
    if (req.numberType === "toll-free") {
      throw new Error("Toll-free search is not enabled in this build");
    }
    const params = new URLSearchParams({
      "filter[country_code]": "US",
      "filter[features]": "sms",
      "filter[limit]": String(Math.min(req.limit ?? 5, 10)),
    });
    if (req.areaCode) params.set("filter[national_destination_code]", req.areaCode);
    const res = await telnyxJson<{ data?: any[] }>(
      "GET",
      `/available_phone_numbers?${params.toString()}`
    );
    const list = res.data || [];
    return list.map((n) => ({
      phoneE164: String(n.phone_number),
      monthlyCostMicros: dollarsToMicros(
        n.cost_information?.monthly_cost ?? n.monthly_cost
      ),
    }));
  }

  async purchaseNumber(phoneE164: string, workspaceId: string) {
    const profileId = messagingProfileId();
    const res = await telnyxJson<{ data?: any }>("POST", "/number_orders", {
      phone_numbers: [{ phone_number: phoneE164 }],
      messaging_profile_id: profileId || undefined,
      customer_reference: workspaceId,
    });
    const data = res.data ?? res;
    const orderId = String(data.id || "");
    // Resolve phone number resource id (may need a follow-up list)
    let providerNumberId = orderId;
    const phones = data.phone_numbers || data.phoneNumbers || [];
    if (Array.isArray(phones) && phones[0]?.id) {
      providerNumberId = String(phones[0].id);
    } else {
      // Look up the number after order
      const listed = await telnyxJson<{ data?: any[] }>(
        "GET",
        `/phone_numbers?filter[phone_number]=${encodeURIComponent(phoneE164)}`
      );
      const match = (listed.data || [])[0];
      if (match?.id) providerNumberId = String(match.id);
      // Ensure messaging profile binding
      if (profileId && match?.id && match.messaging_profile_id !== profileId) {
        await telnyxJson("PATCH", `/phone_numbers/${match.id}`, {
          messaging_profile_id: profileId,
        });
      }
    }
    return {
      phoneE164,
      providerNumberId,
      monthlyCostMicros: MOCK_PROVIDER_COSTS.numberMonthlyMicros,
    };
  }

  async assignNumber(providerNumberId: string, providerCampaignId: string): Promise<void> {
    // providerNumberId may be a Telnyx phone number id OR an E.164.
    let phoneE164 = providerNumberId;
    if (!providerNumberId.startsWith("+")) {
      const num = await telnyxJson<{ data?: any }>(
        "GET",
        `/phone_numbers/${encodeURIComponent(providerNumberId)}`
      );
      phoneE164 = String((num.data ?? num).phone_number || "");
    }
    if (!phoneE164.startsWith("+")) {
      throw new Error("assignNumber could not resolve E.164 phone");
    }

    // Telnyx has used both phoneNumberCampaign and phone_number_campaigns.
    try {
      await telnyxJson("POST", "/10dlc/phoneNumberCampaign", {
        phoneNumber: phoneE164,
        campaignId: providerCampaignId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404") || msg.includes("10005")) {
        await telnyxJson("POST", "/10dlc/phone_number_campaigns", {
          phoneNumber: phoneE164,
          campaignId: providerCampaignId,
        });
      } else {
        throw err;
      }
    }
  }

  async createMessagingProfile(req: MessagingProfileRequest): Promise<MessagingProfileRecord> {
    const res = await telnyxJson<{ data?: any }>("POST", "/messaging_profiles", {
      name: req.name,
      webhook_url: req.webhookUrl,
      webhook_api_version: "2",
      whitelisted_destinations: ["US"],
    });
    const data = res.data ?? res;
    return { providerProfileId: String(data.id) };
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
    // Soft: detach messaging profile so the number cannot send.
    await telnyxJson("PATCH", `/phone_numbers/${encodeURIComponent(providerNumberId)}`, {
      messaging_profile_id: null,
    });
  }

  async releaseNumber(providerNumberId: string): Promise<void> {
    await telnyxJson("DELETE", `/phone_numbers/${encodeURIComponent(providerNumberId)}`);
  }
}
