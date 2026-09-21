import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSmsCertWorkspace, smsCertWorkspaceIds } from "@/lib/sms/cert-access";

describe("sms cert workspace allowlist", () => {
  it("parses comma-separated workspace ids", () => {
    const prev = process.env.SENDFABLE_SMS_CERT_WORKSPACE_IDS;
    process.env.SENDFABLE_SMS_CERT_WORKSPACE_IDS = "ws_a, ws_b ,ws_c";
    try {
      assert.deepEqual(smsCertWorkspaceIds(), ["ws_a", "ws_b", "ws_c"]);
      assert.equal(isSmsCertWorkspace("ws_b"), true);
      assert.equal(isSmsCertWorkspace("ws_other"), false);
    } finally {
      if (prev === undefined) delete process.env.SENDFABLE_SMS_CERT_WORKSPACE_IDS;
      else process.env.SENDFABLE_SMS_CERT_WORKSPACE_IDS = prev;
    }
  });

  it("defaults to empty (no public bypass)", () => {
    const prev = process.env.SENDFABLE_SMS_CERT_WORKSPACE_IDS;
    delete process.env.SENDFABLE_SMS_CERT_WORKSPACE_IDS;
    try {
      assert.deepEqual(smsCertWorkspaceIds(), []);
      assert.equal(isSmsCertWorkspace("anything"), false);
    } finally {
      if (prev !== undefined) process.env.SENDFABLE_SMS_CERT_WORKSPACE_IDS = prev;
    }
  });
});
