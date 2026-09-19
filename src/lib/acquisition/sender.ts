import { SESv2Client, GetEmailIdentityCommand } from "@aws-sdk/client-sesv2";
import {
  acquisitionFallbackFromAddress,
  acquisitionFromAddress,
  parseFromEmail,
} from "@/lib/acquisition/flags";
import { isDevMailMode } from "@/lib/mailer";

let cached: { email: string; ok: boolean; at: number; detail?: string; from: string } | null =
  null;
const CACHE_MS = 5 * 60_000;

async function checkIdentity(
  client: SESv2Client,
  email: string
): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await client.send(new GetEmailIdentityCommand({ EmailIdentity: email }));
    if (res.VerifiedForSendingStatus) {
      return { ok: true, detail: "ses_verified" };
    }
  } catch {
    /* try domain */
  }
  const domain = email.split("@")[1];
  if (!domain) return { ok: false, detail: "invalid_email" };
  try {
    const res = await client.send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
    if (res.VerifiedForSendingStatus) {
      return { ok: true, detail: "ses_domain_verified" };
    }
    return { ok: false, detail: `ses_domain_not_verified:${res.VerificationStatus || "unknown"}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.name : "ses_error" };
  }
}

export async function verifyAcquisitionSender(): Promise<{
  ok: boolean;
  email: string | null;
  from: string;
  detail: string;
}> {
  const preferredFrom = acquisitionFromAddress();
  const preferredEmail = parseFromEmail(preferredFrom);
  if (!preferredEmail) {
    return { ok: false, email: null, from: preferredFrom, detail: "invalid_from_header" };
  }

  if (cached && cached.email === preferredEmail && Date.now() - cached.at < CACHE_MS) {
    return {
      ok: cached.ok,
      email: preferredEmail,
      from: cached.from,
      detail: cached.detail || (cached.ok ? "cached_ok" : "cached_fail"),
    };
  }

  if (isDevMailMode()) {
    cached = {
      email: preferredEmail,
      ok: true,
      at: Date.now(),
      detail: "dev_mail_mode",
      from: preferredFrom,
    };
    return { ok: true, email: preferredEmail, from: preferredFrom, detail: "dev_mail_mode" };
  }

  const client = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });
  const primary = await checkIdentity(client, preferredEmail);
  if (primary.ok) {
    cached = {
      email: preferredEmail,
      ok: true,
      at: Date.now(),
      detail: primary.detail,
      from: preferredFrom,
    };
    return { ok: true, email: preferredEmail, from: preferredFrom, detail: primary.detail };
  }

  // Prefer truthful "SendFable Team" display even if envelope must stay on casey@
  const fallbackFrom = acquisitionFallbackFromAddress();
  const fallbackEmail = parseFromEmail(fallbackFrom);
  if (fallbackEmail && fallbackEmail !== preferredEmail) {
    const secondary = await checkIdentity(client, fallbackEmail);
    if (secondary.ok) {
      cached = {
        email: fallbackEmail,
        ok: true,
        at: Date.now(),
        detail: `${secondary.detail}:fallback_envelope`,
        from: fallbackFrom,
      };
      return {
        ok: true,
        email: fallbackEmail,
        from: fallbackFrom,
        detail: `${secondary.detail}:fallback_envelope`,
      };
    }
  }

  cached = {
    email: preferredEmail,
    ok: false,
    at: Date.now(),
    detail: primary.detail,
    from: preferredFrom,
  };
  return { ok: false, email: preferredEmail, from: preferredFrom, detail: primary.detail };
}

/** Clear cache (tests / after owner verifies identity). */
export function clearSenderVerificationCache(): void {
  cached = null;
}
