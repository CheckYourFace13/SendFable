import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkSpamCopy } from "@/lib/tools/spam-check";

describe("spam checker example", () => {
  it("flags several phrases and formatting on the Load example copy", () => {
    const subject = "URGENT: Act now — limited time!!!";
    const body = [
      "Congratulations winner!!! Buy now and click here for your risk-free, 100% free offer $$$.",
      "This is not spam. Dear friend, make money with once in a lifetime guaranteed results.",
      "Order now: https://example.com/a https://example.com/b https://example.com/c",
    ].join(" ");
    const result = checkSpamCopy(subject, body);
    assert.ok(result.phrases.length >= 6);
    assert.ok(result.formatting.length >= 1);
  });
});
