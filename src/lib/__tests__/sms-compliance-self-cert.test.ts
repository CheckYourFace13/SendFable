/**
 * SMS compliance self-certification guards (copy + disclosure presence).
 * Not legal advice — verifies product implementation surfaces exist.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSmsConsentDisclosure,
  buildSmsHelpReply,
  buildSmsOptInConfirmation,
  buildSmsStopReply,
  SMS_CONSENT_DISCLOSURE_VERSION,
} from "../sms/consent";
import { FORM_PRESETS } from "../form-presets";
import { CURRENT_POLICY_BUNDLE, POLICY_VERSIONS } from "../legal-policies";

const root = join(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("SMS compliance self-certification surfaces", () => {
  it("consent disclosure includes CTIA-style required phrases and brand", () => {
    const text = buildSmsConsentDisclosure({
      brandName: "North Loop Books",
      privacyPolicyUrl: "https://sendfable.com/privacy",
      smsTermsUrl: "https://sendfable.com/terms",
    });
    assert.match(text, /North Loop Books/);
    assert.match(text, /recurring marketing/i);
    assert.match(text, /Message frequency varies/i);
    assert.match(text, /Message and data rates may apply/i);
    assert.match(text, /STOP/);
    assert.match(text, /HELP/);
    assert.match(text, /not a condition of purchase/i);
    assert.match(text, /will not be sold or shared/i);
    assert.match(text, /Privacy Policy/);
    assert.match(text, /SMS Terms/);
    assert.ok(SMS_CONSENT_DISCLOSURE_VERSION.startsWith("sms-consent-"));
  });

  it("opt-in confirmation, HELP, and STOP are brand-specific without owner leak", () => {
    const confirm = buildSmsOptInConfirmation({
      brandName: "North Loop Books",
      useCaseLabel: "offers and news from us",
    });
    assert.match(confirm, /North Loop Books/);
    assert.match(confirm, /Msg frequency varies|Msg & data rates/i);
    assert.match(confirm, /STOP/);
    assert.match(confirm, /HELP/);
    assert.doesNotMatch(confirm, /iScream|chris@iscreamstudio|Telnyx/i);

    const help = buildSmsHelpReply({
      brandName: "North Loop Books",
      supportEmail: "hello@northloop.example",
    });
    assert.match(help, /North Loop Books/);
    assert.match(help, /hello@northloop\.example/);
    assert.doesNotMatch(help, /iScream|chris@iscreamstudio|Telnyx/i);

    const stop = buildSmsStopReply("North Loop Books");
    assert.match(stop, /North Loop Books/);
    assert.match(stop, /unsubscribed/i);
  });

  it("form presets keep SMS consent separate and phone optional on email+text", () => {
    assert.equal(FORM_PRESETS.email.collectPhone, false);
    assert.equal(FORM_PRESETS.text.fields.find((f) => f.key === "phone")?.required, true);
    assert.equal(FORM_PRESETS["email-and-text"].fields.find((f) => f.key === "phone")?.required, false);
    assert.equal(FORM_PRESETS["email-and-text"].fields.find((f) => f.key === "email")?.required, false);
    // SMS consent is never a field preset checkbox — hosted client adds it separately.
    for (const preset of Object.values(FORM_PRESETS)) {
      assert.ok(!preset.fields.some((f) => f.key === "smsConsent"));
    }
  });

  it("hosted form client never prechecks SMS consent and keeps it optional", () => {
    const src = read("app/f/[slug]/form-client.tsx");
    assert.match(src, /setSmsConsent\(false\)/);
    assert.match(src, /Optional — not required to submit/);
    assert.match(src, /Email signup does not\s+imply SMS consent/);
    assert.match(src, /fields\.smsConsent = smsConsent/);
    assert.doesNotMatch(src, /required=\{.*smsConsent/);
  });

  it("Privacy and Terms pages include dedicated SMS sections", () => {
    const privacy = read("app/(marketing)/privacy/page.tsx");
    assert.match(privacy, /Text Messaging \(SMS\) when enabled/);
    assert.match(privacy, /not sold/i);
    assert.match(privacy, /promotional or marketing purposes/i);
    assert.match(privacy, /Telnyx/);
    assert.match(privacy, /STOP/);

    const terms = read("app/(marketing)/terms/page.tsx");
    assert.match(terms, /Text Messaging \(SMS\) when enabled/);
    assert.match(terms, /valid Recipient consent/i);
    assert.match(terms, /Message frequency may vary/i);
    assert.match(terms, /Reply STOP/i);
    assert.match(terms, /HELP/i);
    assert.match(terms, /do not guarantee delivery/i);

    assert.equal(POLICY_VERSIONS.privacy, "2026-09-21");
    assert.equal(POLICY_VERSIONS.terms, "2026-09-21");
    assert.equal(CURRENT_POLICY_BUNDLE, "2026-09-21");
  });
});
