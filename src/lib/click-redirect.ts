/**
 * Click-time validation for stored campaign links.
 * Stored URLs are treated as untrusted even though they were checked at
 * campaign-compile time. Synchronous (no DNS) so the click redirect stays fast;
 * blocks scheme abuse, credentials, localhost/private-literal hosts, and
 * malformed/protocol-relative values. Private-DNS rebinding is out of scope
 * for a 302 redirect (the browser, not our server, performs the request).
 */
import net from "net";

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal"];
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const n = ip.toLowerCase();
    return n === "::1" || n.startsWith("fc") || n.startsWith("fd") || n.startsWith("fe80") || n === "::";
  }
  return false;
}

/**
 * Returns a normalized safe URL string for redirecting, or null when the
 * stored target must not be redirected to.
 */
export function safeClickRedirectUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  // CRLF / control characters — header-injection class input.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  // Protocol-relative is ambiguous — reject.
  if (value.startsWith("//")) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return null;
  if (BLOCKED_HOSTNAMES.has(host)) return null;
  if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) return null;
  if (net.isIP(host) && isPrivateIp(host)) return null;
  // Bare single-label hostnames (e.g. "intranet") are not routable publicly.
  if (!host.includes(".") && !net.isIP(host)) return null;

  return url.toString();
}
