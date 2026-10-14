import { promises as dns } from "node:dns";
import { domainToASCII } from "node:url";
import { inquiryEmailProblem, normalizeInquiryEmail } from "@/lib/inquiry/email-syntax";

export { inquiryEmailProblem, normalizeInquiryEmail } from "@/lib/inquiry/email-syntax";

/** Why an inquiry address was refused. Callers show one friendly message. */
export type InquiryEmailReason = "empty" | "syntax" | "placeholder" | "dns" | "unknown";

export type InquiryEmailResult =
  | { ok: true; email: string }
  | { ok: false; error: string; reason: InquiryEmailReason };

const FRIENDLY = "Enter a valid email address.";

export type MailDnsLookup = (domain: string) => Promise<"ok" | "missing" | "unknown">;

export async function validateInquiryEmail(
  raw: string,
  lookup: MailDnsLookup = lookupMailDns,
): Promise<InquiryEmailResult> {
  const problem = inquiryEmailProblem(raw);
  if (problem) return { ok: false, error: FRIENDLY, reason: problem };
  const email = normalizeInquiryEmail(raw);
  if (!email) return { ok: false, error: FRIENDLY, reason: "syntax" };
  const at = email.lastIndexOf("@");
  const asciiDomain = domainToASCII(email.slice(at + 1));
  if (!asciiDomain) return { ok: false, error: FRIENDLY, reason: "syntax" };
  let dnsResult: "ok" | "missing" | "unknown";
  try {
    dnsResult = await lookup(asciiDomain);
  } catch {
    dnsResult = "unknown";
  }
  if (dnsResult === "missing") return { ok: false, error: FRIENDLY, reason: "dns" };
  return { ok: true, email: `${email.slice(0, at)}@${asciiDomain}` };
}

export async function lookupMailDns(domain: string): Promise<"ok" | "missing" | "unknown"> {
  try {
    const mx = await withTimeout(dns.resolveMx(domain), 2500);
    if (mx.some((row) => row.exchange)) return "ok";
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENOTFOUND") return "missing";
    if (code !== "ENODATA" && code !== "ENOENT") return "unknown";
  }
  for (const resolve of [dns.resolve4, dns.resolve6]) {
    try {
      const rows = await withTimeout(resolve(domain), 2500);
      if (rows.length > 0) return "ok";
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ENOTFOUND" || code === "ENODATA" || code === "ENOENT") continue;
      return "unknown";
    }
  }
  return "missing";
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms);
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
