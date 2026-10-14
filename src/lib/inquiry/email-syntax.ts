/** Browser-safe inquiry email syntax. DNS checks stay on the server. */

export type InquirySyntaxProblem = "empty" | "syntax" | "placeholder";

const RESERVED_TLDS = new Set(["example", "invalid", "test", "localhost", "local"]);

const FILE_TLDS = new Set([
  "css",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "js",
  "html",
  "htm",
  "pdf",
  "zip",
]);

const PLACEHOLDER_DOMAINS = new Set(["example.com", "example.org", "example.net", "localhost"]);

const LOCAL_RE = /^(?=.{1,64}$)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL_RE = /^(?=.{1,63}$)[\p{L}0-9](?:[\p{L}0-9-]{0,61}[\p{L}0-9])?$/u;

export function inquiryEmailProblem(raw: string): InquirySyntaxProblem | null {
  if (typeof raw !== "string") return "syntax";
  if (/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/.test(raw)) return "syntax";
  const trimmed = raw.trim();
  if (!trimmed) return "empty";
  if (/\s/.test(trimmed)) return "syntax";
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at !== trimmed.indexOf("@")) return "syntax";
  const local = trimmed.slice(0, at);
  const domain = normalizeDomain(trimmed.slice(at + 1));
  if (!LOCAL_RE.test(local) || !domain) return "syntax";
  if (isPlaceholderDomain(domain)) return "placeholder";
  return null;
}

export function normalizeInquiryEmail(raw: string): string | null {
  if (inquiryEmailProblem(raw)) return null;
  const trimmed = raw.trim();
  const at = trimmed.lastIndexOf("@");
  const local = trimmed.slice(0, at);
  const domain = normalizeDomain(trimmed.slice(at + 1));
  if (!domain) return null;
  return `${local}@${domain}`;
}

function normalizeDomain(domainRaw: string): string | null {
  const domain = domainRaw.toLowerCase();
  if (!domain || domain.length > 253 || domain.startsWith(".") || domain.endsWith(".")) return null;
  const labels = domain.split(".");
  if (labels.length < 2) return null;
  for (const label of labels) {
    if (!LABEL_RE.test(label)) return null;
  }
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || FILE_TLDS.has(tld) || !/^\p{L}{2,63}$/u.test(tld)) return null;
  return domain;
}

function isPlaceholderDomain(domain: string): boolean {
  if (PLACEHOLDER_DOMAINS.has(domain)) return true;
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  return RESERVED_TLDS.has(tld);
}
