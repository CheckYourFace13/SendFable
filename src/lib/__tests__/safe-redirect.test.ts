import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeCallbackPath, safeCallbackFromUrl, SAFE_REDIRECT_FALLBACK } from "../safe-redirect";

describe("safeCallbackPath", () => {
  it("allows normal app paths", () => {
    assert.equal(safeCallbackPath("/dashboard"), "/dashboard");
    assert.equal(safeCallbackPath("/billing"), "/billing");
    assert.equal(safeCallbackPath("/campaigns/abc?tab=stats"), "/campaigns/abc?tab=stats");
  });

  it("rejects absolute external URLs", () => {
    assert.equal(safeCallbackPath("https://evil.example"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("http://evil.example/phish"), SAFE_REDIRECT_FALLBACK);
  });

  it("rejects protocol-relative URLs", () => {
    assert.equal(safeCallbackPath("//evil.example"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("//evil.example/path"), SAFE_REDIRECT_FALLBACK);
  });

  it("rejects backslash and mixed-slash bypasses", () => {
    assert.equal(safeCallbackPath("/\\evil.example"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("\\/evil.example"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("\\\\evil.example"), SAFE_REDIRECT_FALLBACK);
  });

  it("rejects encoded external URLs", () => {
    assert.equal(safeCallbackPath("https%3A%2F%2Fevil.example"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("%2F%2Fevil.example"), SAFE_REDIRECT_FALLBACK);
  });

  it("rejects double-encoded external URLs", () => {
    assert.equal(safeCallbackPath("https%253A%252F%252Fevil.example"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("%252F%252Fevil.example"), SAFE_REDIRECT_FALLBACK);
  });

  it("rejects unsafe schemes", () => {
    assert.equal(safeCallbackPath("javascript:alert(1)"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("data:text/html,<script>alert(1)</script>"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("file:///etc/passwd"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("vbscript:msgbox(1)"), SAFE_REDIRECT_FALLBACK);
  });

  it("rejects blank and malformed values", () => {
    assert.equal(safeCallbackPath(""), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("   "), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath(null), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath(undefined), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("no-leading-slash"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath(123 as unknown as string), SAFE_REDIRECT_FALLBACK);
  });

  it("rejects CRLF injection", () => {
    assert.equal(safeCallbackPath("/dash%0d%0aSet-Cookie:x=1"), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackPath("/dash\r\nLocation: https://evil.example"), SAFE_REDIRECT_FALLBACK);
  });

  it("supports a custom fallback", () => {
    assert.equal(safeCallbackPath("https://evil.example", "/home"), "/home");
  });
});

describe("safeCallbackFromUrl", () => {
  const base = "https://sendfable.com";

  it("keeps same-origin URLs as paths", () => {
    assert.equal(safeCallbackFromUrl("https://sendfable.com/billing", base), "/billing");
    assert.equal(safeCallbackFromUrl("/contacts", base), "/contacts");
  });

  it("rejects cross-origin URLs", () => {
    assert.equal(safeCallbackFromUrl("https://evil.example/billing", base), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackFromUrl("//evil.example", base), SAFE_REDIRECT_FALLBACK);
    assert.equal(safeCallbackFromUrl("javascript:alert(1)", base), SAFE_REDIRECT_FALLBACK);
  });
});
