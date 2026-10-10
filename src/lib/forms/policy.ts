import type { SuppressionReason } from "@prisma/client";

export type RejoinDecision = "allow" | "reopt-in" | "silent";

/** Complaints, bounces, and manual or global blocks stay blocked. An unsubscribe can rejoin. */
export function emailRejoinDecision(input: {
  localReason: SuppressionReason | null;
  globallySuppressed: boolean;
  contactStatus: string | null;
}): RejoinDecision {
  if (input.globallySuppressed) return "silent";
  if (input.contactStatus === "COMPLAINED" || input.contactStatus === "BOUNCED") return "silent";
  if (input.localReason === "COMPLAINT" || input.localReason === "HARD_BOUNCE" || input.localReason === "MANUAL") {
    return "silent";
  }
  if (input.localReason === "UNSUBSCRIBED" || input.contactStatus === "UNSUBSCRIBED") return "reopt-in";
  return "allow";
}

/** Prefer the address nginx sets from the TCP peer. Ignore a spoofed first X-Forwarded-For hop. */
export function formClientIp(headers: { get(name: string): string | null }): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  const fwd = headers.get("x-forwarded-for");
  if (!fwd) return "unknown";
  const parts = fwd.split(",").map((part) => part.trim()).filter(Boolean);
  return (parts[parts.length - 1] || "unknown").slice(0, 80);
}

export function formRateKey(slug: string, ip: string): string {
  return `form:${slug}:${ip}`;
}

const MIN_FILL_MS = 2_000;
const MAX_FILL_MS = 2 * 60 * 60 * 1000;

export function fillTimingOk(issuedAtIso: string, now = Date.now()): boolean {
  const issued = Date.parse(issuedAtIso);
  if (!Number.isFinite(issued)) return false;
  const age = now - issued;
  return age >= MIN_FILL_MS && age <= MAX_FILL_MS;
}

export function honeypotTripped(value: unknown): boolean {
  return typeof value === "string" ? value.trim().length > 0 : value != null && value !== false;
}

export function sanitizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 500);
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeUtm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 80);
  if (!trimmed || !/^[A-Za-z0-9._~+\- ]+$/.test(trimmed)) return null;
  return trimmed;
}
