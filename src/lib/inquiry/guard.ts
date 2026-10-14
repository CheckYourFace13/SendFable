import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const MIN_AGE_MS = 2_000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET || process.env.INQUIRY_FORM_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET is not set");
  return value;
}

export function issueInquiryToken(form: string, now = Date.now()): string {
  const payload = `${form}.${now}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Null when the token is fresh enough to accept. */
export function inquiryTokenError(form: string, token: string | undefined, now = Date.now()): string | null {
  if (!token || typeof token !== "string") return "Please refresh the page and try again.";
  const parts = token.split(".");
  if (parts.length !== 3) return "Please refresh the page and try again.";
  const [formId, issuedRaw, sig] = parts;
  if (formId !== form || !/^\d+$/.test(issuedRaw)) return "Please refresh the page and try again.";
  const expected = createHmac("sha256", secret()).update(`${formId}.${issuedRaw}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "Please refresh the page and try again.";
  const age = now - Number(issuedRaw);
  if (age < MIN_AGE_MS) return "Please wait a moment and try again.";
  if (age > MAX_AGE_MS) return "Please refresh the page and try again.";
  return null;
}

const OBVIOUS_SPAM = [
  /\bguest posts?\b/i,
  /\bbacklinks?\b/i,
  /\blink[- ]building\b/i,
  /\bseo services\b/i,
  /\bincrease (your )?traffic\b/i,
  /\bbuy (cheap )?traffic\b/i,
  /\b(crypto|bitcoin) (investment|signals?)\b/i,
  /\bforex signals?\b/i,
  /\b(viagra|cialis)\b/i,
  /\bwe (noticed|visited) your (web)?site\b/i,
  /\bdomain authority\b/i,
];

/** Conservative. One obvious solicitation pattern is enough. Uncertain copy stays legitimate. */
export function classifyInquirySpam(message: string): "SPAM" | "OK" {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text) return "OK";
  if (OBVIOUS_SPAM.some((re) => re.test(text))) return "SPAM";
  const links = text.match(/https?:\/\//gi)?.length ?? 0;
  if (links >= 5) return "SPAM";
  return "OK";
}

export function inquiryDuplicateKey(email: string, message: string): string {
  const body = message.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(`${email}\n${body}`).digest("hex");
}
