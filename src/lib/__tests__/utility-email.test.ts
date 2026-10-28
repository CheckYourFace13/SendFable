import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildInitialEmail } from "@/lib/acquisition/personalize";
import {
  coreMarketingWordCount,
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

  it("stays short and shows the Signup Tool preview", () => {
    const mail = renderUtilitySignupEmail({
      businessName: "KarPool Band",
      category: "band",
      ctaUrl: "https://sendfable.com/try/signup-tool",
      unsubUrl: "https://sendfable.com/u",
    });
    assert.ok(coreMarketingWordCount(mail.copy) >= 50);
    assert.ok(coreMarketingWordCount(mail.copy) <= 100);
    assert.match(mail.html, /SendFable/);
    assert.match(mail.html, /Build your fan list from your own website/);
    assert.match(mail.html, /Fans audience/);
    assert.match(mail.html, /Venues audience/);
    assert.match(mail.html, /Join the list/);
    assert.match(mail.html, /Build your signup tool/);
    assert.match(mail.html, /https:\/\/sendfable.com\/try\/signup-tool/);
    assert.match(mail.html, />Unsubscribe</);
    assert.match(mail.html, /Legal: iScream Studio INC/);
    assert.doesNotMatch(mail.html, /iScream Studio INC · SendFable/);
    assert.doesNotMatch(mail.html, /FREE!!!/i);
    assert.match(mail.text, /Unsubscribe:/);
    assert.match(mail.text, /Fans audience · Venues audience/);
  });

  it("keeps Casey From on the aligned send domain", () => {
    assert.equal(ACQUISITION_PREFERRED_FROM, "Casey at SendFable <casey@send.sendfable.com>");
    const send = readFileSync(join(process.cwd(), "src/lib/acquisition/send.ts"), "utf8");
    assert.match(send, /renderUtilitySignupEmail/);
    assert.match(send, /List-Unsubscribe-Post/);
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
    assert.match(built.bodyText, /You choose when it sends/);
  });
});
