/**
 * Read-only Telnyx + 10DLC production state inspector.
 * Never prints secrets. Safe GET-only (except optional number list).
 *
 * Usage on VPS:
 *   npx tsx scripts/vps-telnyx-10dlc-inspect.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

const BASE = "https://api.telnyx.com/v2";

function key(): string {
  const k = process.env.TELNYX_API_KEY?.trim();
  if (!k) throw new Error("TELNYX_API_KEY missing");
  return k;
}

function redact(s: string): string {
  return s
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/KEY[A-Z0-9_]{8,}/gi, "[redacted]")
    .slice(0, 800);
}

async function telnyxGet(path: string): Promise<{ status: number; json: any; error?: string }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${key()}`, Accept: "application/json" },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    return { status: res.status, json: null, error: redact(text) };
  }
  if (!res.ok) {
    return {
      status: res.status,
      json,
      error: redact(JSON.stringify(json?.errors || json || text)),
    };
  }
  return { status: res.status, json };
}

function pick(obj: any, keys: string[]) {
  if (!obj || typeof obj !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

async function main() {
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID?.trim() || "";
  const out: Record<string, unknown> = {
    auth: "UNKNOWN",
    messagingProfile: null,
    phoneNumbers: null,
    brands: null,
    campaigns: null,
    phoneNumberCampaigns: null,
    webhookHints: null,
    flags: {
      public: process.env.SENDFABLE_SMS_PUBLIC_ENABLED,
      signup: process.env.SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED,
      live: process.env.SENDFABLE_SMS_LIVE_SENDING_ENABLED,
      inbound: process.env.SENDFABLE_SMS_INBOUND_ENABLED,
      reply: process.env.SENDFABLE_SMS_REPLY_ENABLED,
      mock: process.env.SENDFABLE_SMS_MOCK_PROVIDER_ENABLED,
      registration: process.env.SENDFABLE_SMS_REGISTRATION_ENABLED,
      numberPurchase: process.env.SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED,
    },
  };

  // Auth + account balance-ish: list messaging profiles
  const profiles = await telnyxGet("/messaging_profiles?page[size]=20");
  if (profiles.status === 401 || profiles.status === 403) {
    out.auth = "FAIL";
    out.authError = profiles.error;
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }
  out.auth = "PASS";

  if (profileId) {
    const p = await telnyxGet(`/messaging_profiles/${profileId}`);
    if (p.status === 200) {
      const d = p.json?.data || {};
      out.messagingProfile = {
        idPresent: true,
        name: d.name,
        enabled: d.enabled,
        webhook_url: d.webhook_url ? "SET" : "MISSING",
        webhook_failover_url: d.webhook_failover_url ? "SET" : "MISSING",
        webhook_api_version: d.webhook_api_version,
        whitelisted_destinations: d.whitelisted_destinations,
      };
    } else {
      out.messagingProfile = { idPresent: true, fetch: "FAIL", error: p.error };
    }
  } else {
    out.messagingProfile = { idPresent: false };
  }

  // Numbers on account
  const nums = await telnyxGet("/phone_numbers?page[size]=50");
  if (nums.status === 200) {
    const list = (nums.json?.data || []) as any[];
    out.phoneNumbers = {
      count: list.length,
      numbers: list.map((n) => ({
        phone_number: n.phone_number,
        status: n.status,
        connection_id: n.connection_id ? "SET" : null,
        messaging_profile_id: n.messaging_profile_id
          ? n.messaging_profile_id === profileId
            ? "MATCHES_PROFILE"
            : "OTHER_PROFILE"
          : "UNASSIGNED",
        features: n.features || n.phone_number_type || null,
      })),
    };
  } else {
    out.phoneNumbers = { fetch: "FAIL", status: nums.status, error: nums.error };
  }

  // 10DLC brands — try modern + legacy paths
  const brandPaths = [
    "/10dlc/brand?page[size]=50",
    "/brand?page[size]=50",
  ];
  for (const path of brandPaths) {
    const b = await telnyxGet(path);
    if (b.status === 200) {
      const list = (b.json?.data || b.json?.records || []) as any[];
      out.brands = {
        endpoint: path,
        count: list.length,
        items: list.map((x) =>
          pick(x, [
            "brandId",
            "id",
            "entityType",
            "displayName",
            "companyName",
            "identityStatus",
            "status",
            "failureReasons",
            "rejectionReasons",
            "tcrBrandId",
            "vertical",
            "createdAt",
            "updatedAt",
          ])
        ),
      };
      break;
    }
    if (!out.brands) out.brands = { tried: [path], lastStatus: b.status, lastError: b.error };
    else {
      (out.brands as any).tried = [...((out.brands as any).tried || []), path];
      (out.brands as any).lastStatus = b.status;
      (out.brands as any).lastError = b.error;
    }
  }

  const campaignPaths = [
    "/10dlc/campaign?page[size]=50",
    "/campaignBuilder?page[size]=50",
    "/campaign?page[size]=50",
  ];
  for (const path of campaignPaths) {
    const c = await telnyxGet(path);
    if (c.status === 200) {
      const list = (c.json?.data || c.json?.records || []) as any[];
      out.campaigns = {
        endpoint: path,
        count: list.length,
        items: list.map((x) =>
          pick(x, [
            "campaignId",
            "id",
            "brandId",
            "usecase",
            "status",
            "statusDescription",
            "failureReasons",
            "rejectionReason",
            "isTMobileRegistered",
            "isATAndTRegistered",
            "isVerizonRegistered",
            "mnoMetadata",
            "tcrCampaignId",
            "createdAt",
            "updatedAt",
            "description",
            "sample1",
            "sample2",
          ])
        ),
      };
      break;
    }
    if (!out.campaigns) out.campaigns = { tried: [path], lastStatus: c.status, lastError: c.error };
    else {
      (out.campaigns as any).tried = [...((out.campaigns as any).tried || []), path];
      (out.campaigns as any).lastStatus = c.status;
      (out.campaigns as any).lastError = c.error;
    }
  }

  // Phone number ↔ campaign assignments
  const pncPaths = [
    "/10dlc/phone_number_campaign?page[size]=50",
    "/10dlc/phoneNumberCampaign?page[size]=50",
  ];
  for (const path of pncPaths) {
    const p = await telnyxGet(path);
    if (p.status === 200) {
      const list = (p.json?.data || p.json?.records || []) as any[];
      out.phoneNumberCampaigns = {
        endpoint: path,
        count: list.length,
        items: list.map((x) =>
          pick(x, ["phoneNumber", "campaignId", "assignmentStatus", "status", "failureReasons", "createdAt"])
        ),
      };
      break;
    }
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error("inspect_failed", e instanceof Error ? e.message : "unknown");
  process.exit(2);
});
