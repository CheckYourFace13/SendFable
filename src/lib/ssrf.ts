import { lookup } from "dns/promises";
import net from "net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
    if (normalized.startsWith("fe80")) return true; // link-local
    return false;
  }
  return true;
}

/**
 * Validate a user-supplied URL for server-side fetch.
 * Blocks non-http(s), credentials in URL, private/link-local IPs after DNS resolve.
 */
export async function assertSafePublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed");
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("That host is not allowed");
  }
  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error("Private network addresses are not allowed");
  }

  // Resolve and check all addresses
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    for (const r of records) {
      if (isPrivateIp(r.address)) {
        throw new Error("That host resolves to a private address");
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("private")) throw err;
    throw new Error("Could not resolve host");
  }

  return url;
}

const MAX_BYTES = 512_000;
const TIMEOUT_MS = 5_000;

/** Fetch text with size/timeout limits after SSRF checks. */
export async function fetchPublicText(rawUrl: string): Promise<{ url: string; body: string; contentType: string }> {
  const url = await assertSafePublicUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "SendfableBrandImport/1.0 (+https://sendfable.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    // Follow one redirect if same-origin-ish public
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect without location");
      const next = new URL(loc, url);
      await assertSafePublicUrl(next.toString());
      const res2 = await fetch(next.toString(), {
        redirect: "error",
        signal: controller.signal,
        headers: {
          "User-Agent": "SendfableBrandImport/1.0 (+https://sendfable.com)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (!res2.ok) throw new Error(`Fetch failed (${res2.status})`);
      const buf = Buffer.from(await res2.arrayBuffer());
      if (buf.length > MAX_BYTES) throw new Error("Response too large");
      return {
        url: next.toString(),
        body: buf.toString("utf8"),
        contentType: res2.headers.get("content-type") || "",
      };
    }
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error("Response too large");
    return {
      url: url.toString(),
      body: buf.toString("utf8"),
      contentType: res.headers.get("content-type") || "",
    };
  } finally {
    clearTimeout(timer);
  }
}
