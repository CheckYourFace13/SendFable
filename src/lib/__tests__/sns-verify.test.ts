import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAllowedSnsCertUrl } from "../sns-verify";

describe("isAllowedSnsCertUrl", () => {
  it("allows HTTPS sns.<region>.amazonaws.com pem URLs", () => {
    assert.equal(
      isAllowedSnsCertUrl(
        "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc123.pem"
      ),
      true
    );
    assert.equal(
      isAllowedSnsCertUrl(
        "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-1234567890.pem"
      ),
      true
    );
  });

  it("rejects non-HTTPS", () => {
    assert.equal(
      isAllowedSnsCertUrl(
        "http://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem"
      ),
      false
    );
  });

  it("rejects non-amazonaws hosts", () => {
    assert.equal(
      isAllowedSnsCertUrl("https://evil.example.com/SimpleNotificationService-abc.pem"),
      false
    );
    assert.equal(
      isAllowedSnsCertUrl("https://sns.us-east-1.amazonaws.com.evil.com/cert.pem"),
      false
    );
  });

  it("rejects credentials in URL and bad paths", () => {
    assert.equal(
      isAllowedSnsCertUrl(
        "https://user:pass@sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem"
      ),
      false
    );
    assert.equal(
      isAllowedSnsCertUrl("https://sns.us-east-1.amazonaws.com/not-a-pem.txt"),
      false
    );
  });

  it("rejects empty / nullish", () => {
    assert.equal(isAllowedSnsCertUrl(""), false);
    assert.equal(isAllowedSnsCertUrl(null), false);
    assert.equal(isAllowedSnsCertUrl(undefined), false);
  });
});
