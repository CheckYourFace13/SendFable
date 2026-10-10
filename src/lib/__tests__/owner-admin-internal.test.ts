import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPlanKey } from "@/lib/admin/internal-workspaces";
import { ADMIN_VIEW_COOKIE } from "@/lib/admin-view";

describe("owner admin internal workspaces", () => {
  it("accepts only real plan keys for INTERNAL PLAN OVERRIDE", () => {
    assert.equal(isPlanKey("FREE"), true);
    assert.equal(isPlanKey("PRO_PLUS"), true);
    assert.equal(isPlanKey("ENTERPRISE"), false);
    assert.equal(isPlanKey(""), false);
  });

  it("uses a dedicated admin-view cookie name (not a query-string backdoor)", () => {
    assert.equal(ADMIN_VIEW_COOKIE, "sf_admin_view");
    assert.equal(ADMIN_VIEW_COOKIE.includes("token"), false);
  });
});
