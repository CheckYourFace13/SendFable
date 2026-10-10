import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeFormFields, requirementModeFor } from "../forms/fields";
import { developerInstructions, embedSnippet } from "../forms/install";
import {
  emailRejoinDecision,
  fillTimingOk,
  formClientIp,
  formRateKey,
  honeypotTripped,
  sanitizeHttpUrl,
  sanitizeUtm,
} from "../forms/policy";

test("form builder keeps email required unless phone is required", () => {
  const ok = normalizeFormFields([
    { key: "email", label: "Email", type: "email", required: true },
    { key: "firstName", label: "First name", type: "text", required: false },
    { key: "phone", label: "Phone", type: "phone", required: false },
  ]);
  assert.equal(ok.error, undefined);
  assert.equal(requirementModeFor(ok.fields), "email-required");

  const phoneOnly = normalizeFormFields([{ key: "phone", label: "Phone", type: "phone", required: true }]);
  assert.equal(requirementModeFor(phoneOnly.fields), "phone-required");

  const optionalEmail = normalizeFormFields([
    { key: "email", label: "Email", type: "email", required: false },
    { key: "firstName", label: "First", type: "text", required: false },
  ]);
  assert.match(optionalEmail.error || "", /phone is required/);
});

test("form builder rejects unknown custom fields", () => {
  const result = normalizeFormFields([{ key: "favorite_color", label: "Color", type: "text", required: false }]);
  assert.match(result.error || "", /not available/);
});

test("embed snippet is a script, not a cross-site iframe", () => {
  const snippet = embedSnippet("https://sendfable.com", "drinkknird-newsletter");
  assert.match(snippet, /data-sendfable-form="drinkknird-newsletter"/);
  assert.match(snippet, /\/embed\/form\.js/);
  assert.equal(snippet.includes("<iframe"), false);
  const page = readFileSync("src/app/(app)/forms/page.tsx", "utf8");
  assert.equal(page.includes("?embed=1"), false);
});

test("developer instructions match the form's fields", () => {
  const text = developerInstructions({
    origin: "https://sendfable.com",
    businessName: "DrinkKnird",
    formName: "DrinkKnird Newsletter",
    slug: "drinkknird-newsletter",
    audienceName: "DrinkKnird Subscribers",
    fields: [
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "phone", required: false },
    ],
    smsConsentEnabled: true,
    successMessage: "Welcome aboard.",
  });
  assert.match(text, /drinkknird-newsletter/);
  assert.match(text, /DrinkKnird Subscribers/);
  assert.match(text, /smsConsent/);
  assert.match(text, /Welcome aboard/);
  assert.equal(text.includes("boatingchicago"), false);
});

test("re-opt-in is allowed after unsubscribe and blocked after a complaint", () => {
  assert.equal(emailRejoinDecision({ localReason: null, globallySuppressed: false, contactStatus: "SUBSCRIBED" }), "allow");
  assert.equal(emailRejoinDecision({ localReason: "UNSUBSCRIBED", globallySuppressed: false, contactStatus: "UNSUBSCRIBED" }), "reopt-in");
  assert.equal(emailRejoinDecision({ localReason: "COMPLAINT", globallySuppressed: false, contactStatus: "COMPLAINED" }), "silent");
  assert.equal(emailRejoinDecision({ localReason: "HARD_BOUNCE", globallySuppressed: false, contactStatus: "BOUNCED" }), "silent");
  assert.equal(emailRejoinDecision({ localReason: null, globallySuppressed: true, contactStatus: "SUBSCRIBED" }), "silent");
});

test("form rate limit uses the real client address, not a spoofed forwarded hop", () => {
  const headers = new Headers({
    "x-real-ip": "203.0.113.10",
    "x-forwarded-for": "1.2.3.4, 203.0.113.10",
  });
  assert.equal(formClientIp(headers), "203.0.113.10");
  assert.equal(formRateKey("drinkknird-newsletter", "203.0.113.10"), "form:drinkknird-newsletter:203.0.113.10");
  const forwardedOnly = new Headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.8" });
  assert.equal(formClientIp(forwardedOnly), "198.51.100.8");
});

test("spam signals reject a filled honeypot and an instant submit", () => {
  assert.equal(honeypotTripped("http://spam.test"), true);
  assert.equal(honeypotTripped(""), false);
  const now = Date.parse("2026-10-10T18:00:10.000Z");
  assert.equal(fillTimingOk("2026-10-10T18:00:09.000Z", now), false);
  assert.equal(fillTimingOk("2026-10-10T18:00:00.000Z", now), true);
  assert.equal(sanitizeHttpUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeUtm("newsletter"), "newsletter");
  assert.equal(sanitizeUtm("<script>"), null);
});
