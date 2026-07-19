import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertSafePublicUrl } from "../ssrf";

describe("assertSafePublicUrl", () => {
  it("rejects localhost", async () => {
    await assert.rejects(() => assertSafePublicUrl("http://localhost/admin"), /not allowed|private/i);
  });

  it("rejects file protocol", async () => {
    await assert.rejects(() => assertSafePublicUrl("file:///etc/passwd"), /http/i);
  });

  it("rejects private IP literals", async () => {
    await assert.rejects(() => assertSafePublicUrl("http://127.0.0.1/"), /private|not allowed/i);
    await assert.rejects(() => assertSafePublicUrl("http://192.168.1.1/"), /private|not allowed/i);
  });
});
