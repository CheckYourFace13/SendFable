import { SESv2Client, GetEmailIdentityCommand } from "@aws-sdk/client-sesv2";
import {
  acquisitionEnvelopeFrom,
  acquisitionFromAddress,
  parseFromEmail,
} from "@/lib/acquisition/flags";
import { isDevMailMode } from "@/lib/mailer";

let cached: {
  email: string;
  envelope: string;
  ok: boolean;
  at: number;
  detail?: string;
} | null = null;
const CACHE_MS = 5 * 60_000;

async function verifySesIdentity(identity: string): Promise<{ ok: boolean; detail: string }> {
  const client = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });
  try {
    const res = await client.send(new GetEmailIdentityCommand({ EmailIdentity: identity }));
    const ok = Boolean(res.VerifiedForSendingStatus);
    return {
      ok,
      detail: ok ? "ses_verified" : `ses_not_verified:${res.VerificationStatus || "unknown"}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.name : "ses_error";
    const domain = identity.includes("@") ? identity.split("@")[1] : identity;
    if (!domain) return { ok: false, detail: msg };
    try {
      const res = await client.send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
      const ok = Boolean(res.VerifiedForSendingStatus);
      return { ok, detail: ok ? "ses_domain_verified" : `ses_domain_not_verified:${msg}` };
    } catch {
      return { ok: false, detail: msg };
    }
  }
}

export async function verifyAcquisitionSender(): Promise<{
  ok: boolean;
  email: string | null;
  from: string;
  envelopeFrom: string;
  detail: string;
}> {
  const from = acquisitionFromAddress();
  const envelopeFrom = acquisitionEnvelopeFrom();
  const email = parseFromEmail(from);
  const envelopeEmail = parseFromEmail(envelopeFrom);
  if (!email) {
    return { ok: false, email: null, from, envelopeFrom, detail: "invalid_from_header" };
  }
  if (!envelopeEmail) {
    return { ok: false, email, from, envelopeFrom, detail: "invalid_envelope_from" };
  }

  if (
    cached &&
    cached.email === email &&
    cached.envelope === envelopeEmail &&
    Date.now() - cached.at < CACHE_MS
  ) {
    return {
      ok: cached.ok,
      email,
      from,
      envelopeFrom,
      detail: cached.detail || (cached.ok ? "cached_ok" : "cached_fail"),
    };
  }

  if (isDevMailMode()) {
    cached = { email, envelope: envelopeEmail, ok: true, at: Date.now(), detail: "dev_mail_mode" };
    return { ok: true, email, from, envelopeFrom, detail: "dev_mail_mode" };
  }

  const visible = await verifySesIdentity(email);
  const envelope = email === envelopeEmail ? visible : await verifySesIdentity(envelopeEmail);
  const ok = visible.ok && envelope.ok;
  const detail = ok
    ? visible.detail
    : `from:${visible.detail};envelope:${envelope.detail}`;
  cached = { email, envelope: envelopeEmail, ok, at: Date.now(), detail };
  return { ok, email, from, envelopeFrom, detail };
}

/** Clear cache (tests / after owner verifies identity). */
export function clearSenderVerificationCache(): void {
  cached = null;
}
