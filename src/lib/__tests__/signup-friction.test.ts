import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLANS, PLAN_STRIPE_CENTS } from "@/lib/plans";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("signup first step friction", () => {
  it("collects only email, password, and terms on /signup", () => {
    const src = read("src/app/(auth)/signup/page.tsx");
    assert.match(src, /<h1[^>]*>\s*Create your account\s*<\/h1>/);
    assert.doesNotMatch(src, /htmlFor="name"/);
    assert.doesNotMatch(src, /Your name/);
    assert.doesNotMatch(src, /htmlFor="workspace"/);
    assert.doesNotMatch(src, /Business or project name/);
    assert.match(src, /htmlFor="email"/);
    assert.match(src, /htmlFor="password"/);
    assert.match(src, /htmlFor="accept-policies"/);
  });

  it("does not require name to create the account", () => {
    const src = read("src/app/api/auth/signup/route.ts");
    assert.match(src, /name:\s*z\.string\(\)\.trim\(\)\.min\(1\)\.max\(80\)\.optional\(\)/);
    assert.match(src, /My workspace/);
    assert.match(src, /tryToken/);
    assert.match(src, /applyTrySignupDraft/);
  });

  it("moves name and optional business name to onboarding", () => {
    const page = read("src/app/(app)/onboarding/page.tsx");
    const api = read("src/app/api/onboarding/route.ts");
    assert.match(page, /What should we call you\?/);
    assert.match(page, /Business name/);
    assert.match(page, /\(optional\)/);
    assert.match(api, /userName:/);
  });

  it("preserves try-builder config when the draft is applied", () => {
    const apply = read("src/lib/try-signup/apply.ts");
    assert.match(apply, /tryBusinessType:\s*config\.businessType/);
    assert.match(apply, /tryAudienceName:\s*config\.audienceName/);
    assert.match(apply, /trySignupFormId:\s*form\.id/);
    assert.match(apply, /tryPlatform:\s*config\.platform/);
    const claim = read("src/app/api/try/claim/route.ts");
    assert.match(claim, /getApiContext/);
    assert.match(claim, /applyTrySignupDraft/);
  });
});

describe("canonical and sitemap", () => {
  it("gives contact, without-gmail, and status self-canonicals", () => {
    for (const [rel, path] of [
      ["src/app/(marketing)/contact/page.tsx", "/contact"],
      ["src/app/(marketing)/email-marketing-without-gmail/page.tsx", "/email-marketing-without-gmail"],
      ["src/app/(marketing)/status/page.tsx", "/status"],
    ] as const) {
      const src = read(rel);
      assert.match(src, /marketingPageMeta/);
      assert.match(src, new RegExp(`path:\\s*"${path}"`));
    }
  });

  it("keeps /feed.xml out of the XML sitemap", () => {
    const src = read("src/app/sitemap.ts");
    assert.doesNotMatch(src, /"\/feed\.xml"/);
  });
});

describe("public pricing freeze", () => {
  it("keeps Starter at $12 and Growth at $29", () => {
    assert.equal(PLANS.STARTER.monthlyPrice, 12);
    assert.equal(PLANS.GROWTH.monthlyPrice, 29);
    assert.equal(PLAN_STRIPE_CENTS.STARTER.monthly, 1_200);
    assert.equal(PLAN_STRIPE_CENTS.GROWTH.monthly, 2_900);
  });
});
