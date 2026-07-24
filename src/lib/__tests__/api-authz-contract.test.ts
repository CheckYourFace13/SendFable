import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Authorization contract: every API route must either authenticate
 * (getApiContext / requirePlatformAdmin / auth()) or be explicitly listed as
 * public-by-design below. Prevents accidentally shipping an unauthenticated
 * workspace endpoint.
 */

const API_ROOT = join(process.cwd(), "src", "app", "api");

/** Routes that are intentionally public (token-, signature-, or rate-limit protected). */
const PUBLIC_BY_DESIGN = new Set([
  "auth/[...nextauth]", // NextAuth handler
  "auth/signup", // gated by ALLOW_PUBLIC_SIGNUP + rate limit
  "auth/verify-email", // token-based
  "auth/resend-verification", // rate-limited, no enumeration
  "early-access", // public form, honeypot + rate limit
  "support", // public form, honeypot + rate limit
  "forms/public/[slug]", // public form definition
  "forms/submit", // public form submission, rate-limited
  "forms/confirm", // double-opt-in token
  "health", // health check
  "identities/verify", // signed sender-verify token from email link
  "invites/accept", // invite token
  "t/c/[recipientId]/[linkId]", // click tracking token IDs
  "t/o/[recipientId]", // open tracking token IDs
  "unsubscribe", // signed unsubscribe token
  "unsubscribe/one-click", // RFC 8058 one-click
  "webhooks/ses", // SNS signature verified
  "webhooks/stripe", // Stripe signature verified
]);

const AUTH_MARKERS = [/getApiContext\s*\(/, /requirePlatformAdmin\s*\(/, /\bauth\s*\(\)/];

function findRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findRoutes(full));
    else if (entry === "route.ts" || entry === "route.tsx") out.push(full);
  }
  return out;
}

describe("API authorization contract", () => {
  const routes = findRoutes(API_ROOT);

  it("finds a plausible number of API routes", () => {
    assert.ok(routes.length >= 40, `expected >= 40 routes, found ${routes.length}`);
  });

  for (const file of routes) {
    const key = relative(API_ROOT, file).split(sep).slice(0, -1).join("/");
    it(`${key} is authenticated or explicitly public`, () => {
      const src = readFileSync(file, "utf8");
      const authed = AUTH_MARKERS.some((m) => m.test(src));
      if (PUBLIC_BY_DESIGN.has(key)) {
        return; // public by design — protected by tokens/signatures/rate limits
      }
      assert.ok(
        authed,
        `${key} has no auth marker (getApiContext/requirePlatformAdmin/auth) and is not in the public allowlist`
      );
    });
  }

  it("public-by-design list has no stale entries", () => {
    const keys = new Set(routes.map((f) => relative(API_ROOT, f).split(sep).slice(0, -1).join("/")));
    for (const p of PUBLIC_BY_DESIGN) {
      assert.ok(keys.has(p), `allowlisted public route no longer exists: ${p}`);
    }
  });
});
