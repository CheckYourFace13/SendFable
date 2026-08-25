import { SESv2Client, GetEmailIdentityCommand } from "@aws-sdk/client-sesv2";
import {
  acquisitionFromAddress,
  parseFromEmail,
} from "@/lib/acquisition/flags";
import { isDevMailMode } from "@/lib/mailer";

let cached: { email: string; ok: boolean; at: number; detail?: string } | null = null;
const CACHE_MS = 5 * 60_000;

export async function verifyAcquisitionSender(): Promise<{
  ok: boolean;
  email: string | null;
  from: string;
  detail: string;
}> {
  const from = acquisitionFromAddress();
  const email = parseFromEmail(from);
  if (!email) {
    return { ok: false, email: null, from, detail: "invalid_from_header" };
  }

  if (cached && cached.email === email && Date.now() - cached.at < CACHE_MS) {
    return { ok: cached.ok, email, from, detail: cached.detail || (cached.ok ? "cached_ok" : "cached_fail") };
  }

  // Dev outbox mode: treat as pass for local QA only (never production with AWS keys)
  if (isDevMailMode()) {
    cached = { email, ok: true, at: Date.now(), detail: "dev_mail_mode" };
    return { ok: true, email, from, detail: "dev_mail_mode" };
  }

  try {
    const client = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });
    const res = await client.send(new GetEmailIdentityCommand({ EmailIdentity: email }));
    const ok = Boolean(res.VerifiedForSendingStatus);
    const detail = ok
      ? "ses_verified"
      : `ses_not_verified:${res.VerificationStatus || "unknown"}`;
    cached = { email, ok, at: Date.now(), detail };
    return { ok, email, from, detail };
  } catch (err) {
    const msg = err instanceof Error ? err.name : "ses_error";
    // Domain-level: try parent domain if address fails
    const domain = email.split("@")[1];
    if (domain) {
      try {
        const client = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });
        const res = await client.send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
        const ok = Boolean(res.VerifiedForSendingStatus);
        const detail = ok ? "ses_domain_verified" : `ses_domain_not_verified:${msg}`;
        cached = { email, ok, at: Date.now(), detail };
        return { ok, email, from, detail };
      } catch {
        /* fall through */
      }
    }
    cached = { email, ok: false, at: Date.now(), detail: msg };
    return { ok: false, email, from, detail: msg };
  }
}

/** Clear cache (tests / after owner verifies identity). */
export function clearSenderVerificationCache(): void {
  cached = null;
}
