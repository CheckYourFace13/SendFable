import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeClickRedirectUrl } from "../click-redirect";

describe("safeClickRedirectUrl", () => {
  it("allows normal public https/http URLs", () => {
    assert.equal(safeClickRedirectUrl("https://example.com/page?a=1"), "https://example.com/page?a=1");
    assert.equal(safeClickRedirectUrl("http://example.com"), "http://example.com/");
    assert.equal(
      safeClickRedirectUrl("https://sub.example.co.uk/path#frag"),
      "https://sub.example.co.uk/path#frag"
    );
  });

  it("rejects unsafe schemes", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,x",
      "file:///etc/passwd",
      "blob:https://example.com/x",
      "ftp://example.com/file",
      "chrome://settings",
      "vbscript:x",
    ]) {
      assert.equal(safeClickRedirectUrl(bad), null, bad);
    }
  });

  it("rejects protocol-relative and malformed values", () => {
    assert.equal(safeClickRedirectUrl("//evil.example"), null);
    assert.equal(safeClickRedirectUrl("not a url"), null);
    assert.equal(safeClickRedirectUrl(""), null);
    assert.equal(safeClickRedirectUrl(null), null);
    assert.equal(safeClickRedirectUrl(undefined), null);
    assert.equal(safeClickRedirectUrl("example.com/no-scheme"), null);
  });

  it("rejects credentials in URL", () => {
    assert.equal(safeClickRedirectUrl("https://user:pass@example.com"), null);
    assert.equal(safeClickRedirectUrl("https://admin@example.com"), null);
  });

  it("rejects localhost and internal hostnames", () => {
    assert.equal(safeClickRedirectUrl("http://localhost:3000/x"), null);
    assert.equal(safeClickRedirectUrl("https://foo.localhost/x"), null);
    assert.equal(safeClickRedirectUrl("https://service.local/x"), null);
    assert.equal(safeClickRedirectUrl("https://db.internal/x"), null);
    assert.equal(safeClickRedirectUrl("https://metadata.google.internal/x"), null);
    assert.equal(safeClickRedirectUrl("https://intranet/x"), null); // single-label host
  });

  it("rejects private and reserved IP literals", () => {
    for (const ip of [
      "http://127.0.0.1/",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://172.16.0.1/",
      "http://169.254.169.254/latest/meta-data",
      "http://0.0.0.0/",
      "http://100.64.0.1/",
      "http://[::1]/",
      "http://[fd00::1]/",
    ]) {
      assert.equal(safeClickRedirectUrl(ip), null, ip);
    }
  });

  it("allows public IP literals", () => {
    assert.equal(safeClickRedirectUrl("http://93.184.216.34/"), "http://93.184.216.34/");
  });

  it("rejects CRLF / control characters", () => {
    assert.equal(safeClickRedirectUrl("https://example.com/\r\nSet-Cookie:x=1"), null);
    assert.equal(safeClickRedirectUrl("https://example.com/\u0000"), null);
  });
});
