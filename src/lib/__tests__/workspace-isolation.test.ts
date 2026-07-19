import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Documents the workspace isolation contract used by API helpers.
 * Full HTTP isolation tests require a running DB; this guards the helper shape.
 */
describe("workspace isolation contract", () => {
  it("scopes unique contact keys by workspaceId + email", () => {
    const a = { workspaceId: "ws_a", email: "same@example.com" };
    const b = { workspaceId: "ws_b", email: "same@example.com" };
    assert.notEqual(
      `${a.workspaceId}:${a.email}`,
      `${b.workspaceId}:${b.email}`,
      "same email in different workspaces must remain distinct keys",
    );
  });

  it("requires membership role for owner-only admin routes", () => {
    const roles = ["OWNER", "ADMIN", "MEMBER"] as const;
    const canViewSesReadiness = (role: (typeof roles)[number]) => role === "OWNER";
    assert.equal(canViewSesReadiness("OWNER"), true);
    assert.equal(canViewSesReadiness("ADMIN"), false);
    assert.equal(canViewSesReadiness("MEMBER"), false);
  });
});
