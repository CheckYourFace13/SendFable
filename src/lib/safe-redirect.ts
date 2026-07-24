/**
 * Centralized post-auth redirect validation.
 *
 * Only relative same-origin paths are allowed. Everything else falls back to
 * a safe authenticated route. Handles encoded/double-encoded, backslash,
 * protocol-relative, and scheme-based bypass attempts.
 */
export const SAFE_REDIRECT_FALLBACK = "/dashboard";

function decodeOnce(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Returns a same-origin relative path beginning with exactly one "/",
 * or the fallback when the input is unsafe.
 */
export function safeCallbackPath(raw: unknown, fallback: string = SAFE_REDIRECT_FALLBACK): string {
  if (typeof raw !== "string") return fallback;
  let value = raw.trim();
  if (!value) return fallback;

  // Undo up to two encoding layers before validating.
  value = decodeOnce(decodeOnce(value));
  value = value.trim();
  if (!value) return fallback;

  // Reject anything with a scheme (javascript:, data:, https:, etc.).
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;

  // Normalize backslashes — browsers treat "\" like "/" in URLs.
  const normalized = value.replace(/\\/g, "/");

  // Must be a single-slash relative path; "//host" is protocol-relative.
  if (!normalized.startsWith("/")) return fallback;
  if (normalized.startsWith("//")) return fallback;

  // Reject control characters / CRLF header-injection attempts.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return fallback;

  // Final parse against a fixed origin: result must stay on that origin.
  try {
    const parsed = new URL(normalized, "https://sendfable.internal");
    if (parsed.origin !== "https://sendfable.internal") return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

/**
 * Validate an absolute callback URL from Auth.js server callbacks.
 * Returns a same-origin path or the fallback.
 */
export function safeCallbackFromUrl(rawUrl: string, baseUrl: string, fallback: string = SAFE_REDIRECT_FALLBACK): string {
  try {
    const base = new URL(baseUrl);
    const target = new URL(rawUrl, base);
    if (target.origin !== base.origin) return fallback;
    return safeCallbackPath(target.pathname + target.search + target.hash, fallback);
  } catch {
    return fallback;
  }
}
