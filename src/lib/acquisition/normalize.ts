import { normalizeEmail } from "@/lib/utils";

/** Strip protocol/www/path → lowercase host for dedupe. */
export function normalizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    let host = u.hostname.replace(/^www\./, "");
    // Drop trailing dots
    host = host.replace(/\.$/, "");
    return host;
  } catch {
    return s
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split("?")[0]
      .replace(/\.$/, "");
  }
}

export function normalizeWebsite(input: string): string {
  const domain = normalizeDomain(input);
  if (!domain) return "";
  return `https://${domain}`;
}

export function normalizeBusinessKey(name: string, domain: string): string {
  const n = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return `${n}|${normalizeDomain(domain)}`;
}

const FILE_EXT_TLDS = new Set([
  "css",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "map",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "mp4",
  "webm",
  "pdf",
  "json",
  "xml",
  "txt",
  "html",
  "htm",
]);

export function isValidEmailSyntax(email: string): boolean {
  const e = normalizeEmail(email);
  // Conservative: no consecutive dots, TLD 2–24 letters, reject asset/file extensions
  if (
    !/^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,24}$/i.test(
      e
    )
  ) {
    return false;
  }
  const tld = e.split(".").pop()?.toLowerCase() || "";
  if (FILE_EXT_TLDS.has(tld)) return false;
  // Reject numeric-only host labels like "11.css" style noise
  const host = e.split("@")[1] || "";
  if (/^\d+\./.test(host)) return false;
  return true;
}

/** Prefer published business mailboxes over generic consumer providers for scoring. */
export function isLikelyPersonalConsumerEmail(email: string): boolean {
  const domain = normalizeEmail(email).split("@")[1] || "";
  const consumer = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "me.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "mail.com",
    "live.com",
    "msn.com",
  ]);
  return consumer.has(domain);
}

export function preferredBusinessLocalParts(): Set<string> {
  return new Set([
    "info",
    "hello",
    "hi",
    "contact",
    "marketing",
    "events",
    "newsletter",
    "press",
    "owners",
    "owner",
    "manager",
    "team",
    "office",
    "admin",
    "support",
  ]);
}

export function emailLocalPart(email: string): string {
  return normalizeEmail(email).split("@")[0] || "";
}
