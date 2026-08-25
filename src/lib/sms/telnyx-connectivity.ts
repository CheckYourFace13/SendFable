/**
 * Read-only Telnyx connectivity probe.
 *
 * Safe by design:
 * - GET requests only (profile + assigned numbers)
 * - Never sends SMS, purchases numbers, or submits 10DLC registration
 * - Independent of SENDFABLE_SMS_* live flags (diagnostics only)
 * - Never returns or logs secret values
 */

import { createPublicKey } from "node:crypto";
import { smsFlagSnapshot, type SmsFlagName } from "@/lib/sms/flags";

const TELNYX_API_BASE = "https://api.telnyx.com/v2";
const EXPECTED_PROFILE_NAME = "SendFable Production";

const LIVE_FLAGS_MUST_BE_FALSE: SmsFlagName[] = [
  "SENDFABLE_SMS_PUBLIC_ENABLED",
  "SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED",
  "SENDFABLE_SMS_BILLING_ENABLED",
  "SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED",
  "SENDFABLE_SMS_REGISTRATION_ENABLED",
  "SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED",
  "SENDFABLE_SMS_LIVE_SENDING_ENABLED",
  "SENDFABLE_SMS_INBOUND_ENABLED",
  "SENDFABLE_SMS_REPLY_ENABLED",
];

export type TelnyxConnectivityResult = {
  apiAuth: "PASS" | "FAIL";
  messagingProfileFound: "PASS" | "FAIL";
  profileName: string | null;
  profileNameMatchesExpected: boolean;
  profileActive: boolean | null;
  usOnlyDestinations: boolean | null;
  whitelistedDestinations: string[] | null;
  assignedNumbers: number | null;
  publicKeyLoadable: "PASS" | "FAIL";
  liveFlagsAllFalse: boolean;
  mockProviderEnabled: boolean;
  flagSnapshot: Record<SmsFlagName, boolean>;
  errors: string[];
};

function maskSecretPresence(name: string): "set" | "missing" {
  const v = process.env[name]?.trim();
  return v ? "set" : "missing";
}

function apiKeyConfigured(): boolean {
  return Boolean(process.env.TELNYX_API_KEY?.trim());
}

function messagingProfileId(): string | null {
  const id = process.env.TELNYX_MESSAGING_PROFILE_ID?.trim();
  return id || null;
}

/** Confirm TELNYX_PUBLIC_KEY is parseable for Ed25519 webhook verification. */
export function canLoadTelnyxPublicKey(): boolean {
  const publicKeyB64 = process.env.TELNYX_PUBLIC_KEY?.trim();
  if (!publicKeyB64) return false;
  try {
    const raw = Buffer.from(publicKeyB64, "base64");
    if (raw.length === 32) {
      createPublicKey({
        key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]),
        format: "der",
        type: "spki",
      });
      return true;
    }
    createPublicKey({ key: raw, format: "der", type: "spki" });
    return true;
  } catch {
    return false;
  }
}

function sanitizeTelnyxErrorBody(text: string): string {
  // Never echo credentials if somehow present; keep short for diagnostics.
  return text
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/KEY[A-Z0-9_]{8,}/gi, "[redacted]")
    .slice(0, 200);
}

async function telnyxGetJson(
  path: string
): Promise<{ ok: true; status: number; json: unknown } | { ok: false; status: number; error: string }> {
  const key = process.env.TELNYX_API_KEY?.trim();
  if (!key) return { ok: false, status: 0, error: "TELNYX_API_KEY missing" };

  const res = await fetch(`${TELNYX_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: `GET ${path} → HTTP ${res.status}: ${sanitizeTelnyxErrorBody(text)}`,
    };
  }

  try {
    return { ok: true, status: res.status, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: res.status, error: `GET ${path} → invalid JSON` };
  }
}

function isUsOnly(destinations: string[] | null | undefined): boolean {
  if (!destinations || destinations.length === 0) return false;
  const normalized = destinations.map((d) => d.trim().toUpperCase());
  return normalized.length === 1 && normalized[0] === "US";
}

/**
 * Perform a read-only Telnyx connectivity check.
 * Does not mutate Telnyx state and does not depend on SMS live flags.
 */
export async function checkTelnyxConnectivity(): Promise<TelnyxConnectivityResult> {
  const errors: string[] = [];
  const flags = smsFlagSnapshot();
  const liveFlagsAllFalse = LIVE_FLAGS_MUST_BE_FALSE.every((f) => flags[f] === false);
  const mockProviderEnabled = flags.SENDFABLE_SMS_MOCK_PROVIDER_ENABLED === true;

  const result: TelnyxConnectivityResult = {
    apiAuth: "FAIL",
    messagingProfileFound: "FAIL",
    profileName: null,
    profileNameMatchesExpected: false,
    profileActive: null,
    usOnlyDestinations: null,
    whitelistedDestinations: null,
    assignedNumbers: null,
    publicKeyLoadable: canLoadTelnyxPublicKey() ? "PASS" : "FAIL",
    liveFlagsAllFalse,
    mockProviderEnabled,
    flagSnapshot: flags,
    errors,
  };

  if (!apiKeyConfigured()) {
    errors.push("TELNYX_API_KEY is not set");
    return result;
  }
  if (maskSecretPresence("TELNYX_PUBLIC_KEY") === "missing") {
    errors.push("TELNYX_PUBLIC_KEY is not set");
  }
  if (result.publicKeyLoadable === "FAIL" && maskSecretPresence("TELNYX_PUBLIC_KEY") === "set") {
    errors.push("TELNYX_PUBLIC_KEY is set but not a valid Ed25519/SPKI public key");
  }

  const profileId = messagingProfileId();
  if (!profileId) {
    errors.push("TELNYX_MESSAGING_PROFILE_ID is not set");
    return result;
  }

  // Auth + profile existence (single GET — no POST/PATCH/DELETE)
  const profileRes = await telnyxGetJson(`/messaging_profiles/${encodeURIComponent(profileId)}`);
  if (!profileRes.ok) {
    if (profileRes.status === 401 || profileRes.status === 403) {
      errors.push("Telnyx API authentication failed");
    } else if (profileRes.status === 404) {
      result.apiAuth = "PASS"; // key authenticated; id not found
      errors.push("Messaging profile id not found");
    } else {
      errors.push(profileRes.error);
    }
    return result;
  }

  result.apiAuth = "PASS";
  result.messagingProfileFound = "PASS";

  const data = (profileRes.json as { data?: Record<string, unknown> })?.data ?? {};
  const name = typeof data.name === "string" ? data.name : null;
  result.profileName = name;
  result.profileNameMatchesExpected = name === EXPECTED_PROFILE_NAME;
  if (!result.profileNameMatchesExpected) {
    errors.push(`Profile name expected "${EXPECTED_PROFILE_NAME}"`);
  }

  result.profileActive = data.enabled === true;
  if (result.profileActive !== true) {
    errors.push("Messaging profile is not enabled/active");
  }

  const destinations = Array.isArray(data.whitelisted_destinations)
    ? (data.whitelisted_destinations as unknown[]).map(String)
    : null;
  result.whitelistedDestinations = destinations;
  result.usOnlyDestinations = isUsOnly(destinations);
  if (!result.usOnlyDestinations) {
    errors.push("whitelisted_destinations is not United States only ([\"US\"])");
  }

  const numbersRes = await telnyxGetJson(
    `/messaging_profiles/${encodeURIComponent(profileId)}/phone_numbers?page[size]=1`
  );
  if (!numbersRes.ok) {
    errors.push(numbersRes.error);
    return result;
  }

  const meta = (numbersRes.json as { meta?: { total_results?: number }; data?: unknown[] })?.meta;
  const list = (numbersRes.json as { data?: unknown[] })?.data;
  if (typeof meta?.total_results === "number") {
    result.assignedNumbers = meta.total_results;
  } else if (Array.isArray(list)) {
    result.assignedNumbers = list.length;
  } else {
    result.assignedNumbers = 0;
  }

  return result;
}

export const TELNYX_EXPECTED_PROFILE_NAME = EXPECTED_PROFILE_NAME;
export const TELNYX_LIVE_FLAGS_MUST_BE_FALSE = LIVE_FLAGS_MUST_BE_FALSE;
