import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  categoryToTryType,
  defaultTryConfig,
  fieldsFromTryConfig,
  sanitizeTryConfig,
  tryBusinessPitch,
  tryConfigMeaningful,
  trySiteChrome,
  UTILITY_SIGNUP_COPY_VERSION,
  UTILITY_SIGNUP_LANDING,
} from "@/lib/try-signup/config";
import { buildFollowUp1 } from "@/lib/acquisition/personalize";
import { scheduleTryFollowUpAt } from "@/lib/try-signup/config";

describe("try signup builder", () => {
  it("maps categories to simple business types with suggested audiences", () => {
    assert.equal(categoryToTryType("brewery"), "brewery");
    assert.equal(defaultTryConfig("band").audienceName, "Fans");
    assert.equal(defaultTryConfig("band").extraAudienceName, "Venues");
    assert.equal(defaultTryConfig("band").firstName, false);
    assert.equal(defaultTryConfig("band").platform, "wordpress");
    assert.equal(trySiteChrome("band", "KarPool Band").siteName, "KarPool Band");
    assert.match(tryBusinessPitch("restaurant"), /private-event/i);
  });

  it("never treats phone as SMS consent", () => {
    const cfg = sanitizeTryConfig({
      businessType: "band",
      audienceName: "Fans",
      extraAudienceName: "Venues",
      firstName: true,
      phone: true,
      smsConsent: true,
    });
    assert.equal(cfg.phone, true);
    assert.equal(cfg.smsConsent, true);
    const noPhone = sanitizeTryConfig({ ...cfg, phone: false, smsConsent: true });
    assert.equal(noPhone.smsConsent, false);
    const fields = fieldsFromTryConfig(cfg);
    assert.deepEqual(
      fields.map((f) => f.key),
      ["email", "firstName", "phone"]
    );
  });

  it("builds a one-follow-up Casey message after someone uses the tool", () => {
    const mail = buildFollowUp1(
      { businessName: "Harbor Lights", firstName: "Ada" },
      {
        unsubUrl: "https://sendfable.com/u",
        copyVersion: UTILITY_SIGNUP_COPY_VERSION,
        landingPath: UTILITY_SIGNUP_LANDING,
        ctaUrl: "https://sendfable.com/try/signup-tool",
      }
    );
    assert.equal(mail.subject, "Your signup tool is ready");
    assert.match(mail.bodyText, /Finish setup/);
    assert.match(mail.bodyText, /unsubscribe/);
  });

  it("delays the follow-up instead of sending immediately", () => {
    const now = new Date("2026-10-28T14:00:00Z");
    const at = scheduleTryFollowUpAt(now, "America/Chicago");
    assert.ok(at.getTime() > now.getTime());
    assert.ok(tryConfigMeaningful(defaultTryConfig("band"), { builder_previewed: now.toISOString() }));
    assert.ok(tryConfigMeaningful(defaultTryConfig("band"), { make_live_clicked: now.toISOString() }));
  });

  it("keeps the public demo off the live form API and account-first CTAs", () => {
    const src = readFileSync(join(process.cwd(), "src/components/marketing/try-signup-builder.tsx"), "utf8");
    assert.doesNotMatch(src, /\/api\/forms\/submit/);
    assert.match(src, /MAKE THIS LIVE — FREE/);
    assert.match(src, /See it working/);
    assert.match(src, /That's what your visitors will see/);
    assert.match(src, /Your code will be ready when you make this signup live/);
    assert.match(src, /demo_signup_submitted/);
    assert.match(src, /demo_signup_success/);
    assert.doesNotMatch(src, /Activate this signup/);
    assert.doesNotMatch(src, /Create your free account to activate this signup/);
    assert.doesNotMatch(src, /TRY_PREVIEW_SNIPPET/);
    assert.doesNotMatch(src, /Preview only/);
    assert.doesNotMatch(src, /Copy preview code/);
    const apply = readFileSync(join(process.cwd(), "src/lib/try-signup/apply.ts"), "utf8");
    assert.match(apply, /claimedAt/);
    assert.match(apply, /scribePreferredAudienceTagId/);
    assert.match(apply, /hostedSlug/);
    assert.doesNotMatch(apply, /enabled:\s*true/);
    const signup = readFileSync(join(process.cwd(), "src/app/api/auth/signup/route.ts"), "utf8");
    assert.match(signup, /applyTrySignupDraft/);
    assert.match(signup, /formId: activatedFormId/);
    assert.match(signup, /hostedSlug: activatedSlug/);
    assert.match(signup, /real_signup_tool_created/);
    const layout = readFileSync(join(process.cwd(), "src/app/(try)/layout.tsx"), "utf8");
    assert.match(layout, /Logo/);
    assert.doesNotMatch(layout, /SiteHeader/);
    assert.doesNotMatch(layout, /SiteFooter/);
    assert.doesNotMatch(layout, /AnnouncementBar/);
  });

  it("shows concise platform install steps without fake working code", async () => {
    const { tryInstallPlatforms, tryInstallSteps } = await import("@/lib/try-signup/install");
    const labels = tryInstallPlatforms().map((p) => p.label);
    assert.deepEqual(labels, ["WordPress", "Wix", "Squarespace", "Webflow", "Other website"]);
    assert.equal(tryInstallSteps("wordpress")[0], "Add a Custom HTML block.");
    assert.equal(tryInstallSteps("other")[0], "Paste the snippet where you want the signup to appear.");
    const src = readFileSync(join(process.cwd(), "src/components/marketing/try-signup-builder.tsx"), "utf8");
    assert.doesNotMatch(src, /data-sendfable-form=/);
  });

  it("exports audience columns and keeps the utility CTA on the try builder", () => {
    const exp = readFileSync(join(process.cwd(), "src/app/api/contacts/export/route.ts"), "utf8");
    assert.match(exp, /phone/);
    assert.match(exp, /text_status/);
    assert.match(exp, /audiences/);
    const send = readFileSync(join(process.cwd(), "src/lib/acquisition/send.ts"), "utf8");
    assert.match(send, /\/try\/signup-tool/);
    const ab = readFileSync(join(process.cwd(), "src/lib/acquisition/conversion-optimize.ts"), "utf8");
    assert.match(ab, /utility_signup/);
    assert.match(ab, /"v1a"/);
  });
});
