import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSesRawMessage, envelopeSourceAddress, parseRfc5322Email } from "@/lib/mailer";

describe("SES raw acquisition envelope", () => {
  it("keeps the visible From while listing unsubscribe headers", () => {
    const raw = Buffer.from(
      buildSesRawMessage({
        from: "Casey at SendFable <casey@sendfable.com>",
        envelopeFrom: "Casey at SendFable <casey@send.sendfable.com>",
        to: "chris@iscreamstudio.com",
        replyTo: "casey@sendfable.com",
        subject: "Put your fan signup on your website",
        text: "Build your signup tool",
        html: "<p>Build your signup tool</p>",
        headers: {
          "List-Unsubscribe": "<https://sendfable.com/u>",
        },
      })
    ).toString("utf8");
    assert.match(raw, /^From: Casey at SendFable <casey@sendfable.com>/m);
    assert.match(raw, /^Reply-To: casey@sendfable.com/m);
    assert.match(raw, /List-Unsubscribe: <https:\/\/sendfable.com\/u>/);
    assert.match(raw, /multipart\/alternative/);
    assert.equal(parseRfc5322Email("Casey at SendFable <casey@sendfable.com>"), "casey@sendfable.com");
    assert.equal(
      envelopeSourceAddress("Casey at SendFable <casey@send.sendfable.com>"),
      "casey@send.sendfable.com"
    );
    const src = readFileSync(join(process.cwd(), "src/lib/mailer.ts"), "utf8");
    assert.match(src, /SendRawEmailCommand/);
    assert.match(src, /Source: source/);
    assert.doesNotMatch(src, /FromEmailAddress: splitEnvelope \? msg\.envelopeFrom/);
  });
});
