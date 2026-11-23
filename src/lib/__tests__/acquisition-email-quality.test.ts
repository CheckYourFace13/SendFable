import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessEmailLocalScore,
  looksLikeGarbledRoleLocal,
} from "@/lib/acquisition/normalize";

describe("acquisition email scrape quality", () => {
  it("flags ninfo-style garbled role locals", () => {
    assert.equal(looksLikeGarbledRoleLocal("ninfo"), true);
    assert.equal(looksLikeGarbledRoleLocal("info"), false);
    assert.equal(looksLikeGarbledRoleLocal("hello"), false);
    assert.equal(looksLikeGarbledRoleLocal("contact"), false);
    assert.equal(looksLikeGarbledRoleLocal("xhello"), true);
    assert.ok(businessEmailLocalScore("ninfo") < 0);
  });
});
