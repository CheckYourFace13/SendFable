import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildInitialEmail } from "@/lib/acquisition/personalize";
import {
  UTILITY_EMAIL_CTA,
  coreMarketingWordCount,
  greeting,
  renderUtilitySignupEmail,
  utilityEmailCopy,
} from "@/lib/acquisition/utility-email";
import { ACQUISITION_PREFERRED_FROM } from "@/lib/acquisition/flags";

describe("utility signup email", () => {
  it("uses benefit-led subjects by business type", () => {
    assert.equal(utilityEmailCopy("band").subject, "Put your fan signup on your website");
    assert.equal(utilityEmailCopy("restaurant").subject, "Turn website visitors into regulars");
    assert.equal(utilityEmailCopy("brewery").subject, "Build your taproom list");
    assert.equal(utilityEmailCopy("contractor").subject, "Keep website leads in one place");
  });

  it("greets without a business name", () => {
    assert.equal(greeting(), "Hi,");
    assert.equal(greeting("Ada"), "Hi Ada,");
    const mail = renderUtilitySignupEmail({
      businessName: "KarPool Band",
      category: "band",
      ctaUrl: "https://sendfable.com/try/signup-tool",
      unsubUrl: "https://sendfable.com/u",
    });
    assert.match(mail.html, />Hi,</);
    assert.doesNotMatch(mail.html, /Hi KarPool Band/);
  });

  it("stays short and shows the Signup Tool preview", () => {
    const mail = renderUtilitySignupEmail({
      businessName: "KarPool Band",
      category: "band",
      ctaUrl: "https://sendfable.com/try/signup-tool?type=band",
      unsubUrl: "https://sendfable.com/u",
    });
    assert.ok(coreMarketingWordCount(mail.copy) >= 35);
    assert.ok(coreMarketingWordCount(mail.copy) <= 80);
    assert.match(mail.html, /SendFable/);
    assert.match(mail.html, /Build your fan list from your website/);
    assert.match(mail.html, /Join the fan list/);
    assert.match(mail.html, />Fans</);
    assert.match(mail.html, />Venues</);
    assert.match(mail.html, new RegExp(UTILITY_EMAIL_CTA));
    assert.match(mail.html, /https:\/\/sendfable.com\/try\/signup-tool\?type=band/);
    assert.match(mail.html, />Unsubscribe</);
    assert.match(mail.html, /SendFable is operated by iScream Studio INC/);
    assert.match(mail.html, /1364 Patriot Blvd/);
    assert.doesNotMatch(mail.html, /Legal: iScream Studio INC/);
    assert.doesNotMatch(mail.html, /iScream Studio INC · SendFable/);
    assert.doesNotMatch(mail.html, /FREE!!!/i);
    assert.match(mail.text, /Unsubscribe:/);
    assert.match(mail.text, /Fans · Venues/);
  });

  it("keeps Casey From on the aligned send domain", () => {
    assert.equal(ACQUISITION_PREFERRED_FROM, "Casey at SendFable <casey@sendfable.com>");
    const send = readFileSync(join(process.cwd(), "src/lib/acquisition/send.ts"), "utf8");
    assert.match(send, /renderUtilitySignupEmail/);
    assert.match(send, /List-Unsubscribe-Post/);
    assert.match(send, /envelopeFrom: sender\.envelopeFrom/);
    const built = buildInitialEmail(
      {
        businessName: "KarPool Band",
        category: "band",
        claim: "I came across your band site.",
        evidence: "public website",
        sourceUrl: "https://karpool.example",
      },
      { unsubUrl: "https://sendfable.com/u", copyVersion: "utility_signup" }
    );
    assert.equal(built.subject, "Put your fan signup on your website");
    assert.match(built.bodyText, /Nothing sends until you schedule it/);
    assert.match(built.bodyText, /Add this signup to your website/);
    assert.doesNotMatch(built.bodyText, /Hi KarPool Band/);
  });
});
