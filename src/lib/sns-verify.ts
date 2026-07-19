import { createVerify, X509Certificate } from "crypto";

export interface SnsSignedMessage {
  Type: string;
  MessageId: string;
  TopicArn?: string;
  Subject?: string;
  Message: string;
  Timestamp?: string;
  Signature?: string;
  SignatureVersion?: string;
  SigningCertURL?: string;
  SigningCertUrl?: string;
  SubscribeURL?: string;
  Token?: string;
}

const CERT_URL_RE =
  /^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\/.+\.pem$/i;

const FETCH_TIMEOUT_MS = 5_000;

/** Allowlist check for SNS SigningCertURL (HTTPS + amazonaws.com SNS host only). */
export function isAllowedSnsCertUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (!CERT_URL_RE.test(parsed.href)) return false;
    // Host must be sns.<region>.amazonaws.com (no extra subdomains / path tricks via host)
    const host = parsed.hostname.toLowerCase();
    if (!/^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function signingString(msg: SnsSignedMessage): string {
  const type = msg.Type;
  const fields: Array<keyof SnsSignedMessage> =
    type === "Notification"
      ? msg.Subject !== undefined
        ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
        : ["Message", "MessageId", "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];

  let out = "";
  for (const key of fields) {
    const value = msg[key];
    if (value == null) continue;
    out += `${key}\n${String(value)}\n`;
  }
  return out;
}

async function fetchCertPem(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { Accept: "application/x-pem-file,application/pkix-cert,*/*" },
    });
    if (!res.ok) throw new Error(`Cert fetch failed (${res.status})`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verify an SNS message Signature using SigningCertURL.
 * Soft-fail when SNS_VERIFY_STRICT=false (local fixtures).
 */
export async function verifySnsSignature(
  msg: SnsSignedMessage
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const strict = process.env.SNS_VERIFY_STRICT !== "false";

  const certUrl = msg.SigningCertURL || msg.SigningCertUrl;
  if (!isAllowedSnsCertUrl(certUrl)) {
    if (!strict) return { ok: true, skipped: true, error: "cert URL not allowlisted (soft-fail)" };
    return { ok: false, error: "Invalid SigningCertURL" };
  }

  if (!msg.Signature) {
    if (!strict) return { ok: true, skipped: true, error: "missing Signature (soft-fail)" };
    return { ok: false, error: "Missing Signature" };
  }

  try {
    const pem = await fetchCertPem(certUrl!);
    const cert = new X509Certificate(pem);
    const verifier = createVerify(msg.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1");
    verifier.update(signingString(msg), "utf8");
    const ok = verifier.verify(cert.publicKey, msg.Signature, "base64");
    if (!ok) {
      if (!strict) return { ok: true, skipped: true, error: "signature mismatch (soft-fail)" };
      return { ok: false, error: "Signature verification failed" };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification error";
    if (!strict) return { ok: true, skipped: true, error: `${message} (soft-fail)` };
    return { ok: false, error: message };
  }
}
