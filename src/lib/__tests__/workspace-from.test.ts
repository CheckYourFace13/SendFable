import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatWorkspaceFrom, identityAllowsFrom, isSharedPlatformDomain } from "@/lib/workspace-from";

const verifiedDomain = [
  { type: "DOMAIN" as const, value: "thedrinkplace.com", status: "VERIFIED" as const },
];

describe("workspace From", () => {
  it("only a verified workspace domain can override From", () => {
    assert.equal(identityAllowsFrom(verifiedDomain, "hello@thedrinkplace.com"), true);
    assert.equal(identityAllowsFrom(verifiedDomain, "hello@other.com"), false);
    assert.equal(
      identityAllowsFrom(
        [{ type: "DOMAIN", value: "thedrinkplace.com", status: "PENDING" }],
        "hello@thedrinkplace.com",
      ),
      false,
    );
    assert.equal(
      identityAllowsFrom(
        [{ type: "ADDRESS", value: "hello@thedrinkplace.com", status: "VERIFIED" }],
        "hello@thedrinkplace.com",
      ),
      true,
    );
    assert.equal(
      identityAllowsFrom(
        [{ type: "ADDRESS", value: "hello@thedrinkplace.com", status: "VERIFIED" }],
        "other@thedrinkplace.com",
      ),
      false,
    );
  });

  it("refuses shared SendFable domains as a custom From", () => {
    assert.equal(isSharedPlatformDomain("send.sendfable.com"), true);
    assert.equal(
      identityAllowsFrom(
        [{ type: "DOMAIN", value: "send.sendfable.com", status: "VERIFIED" }],
        "no-reply@send.sendfable.com",
      ),
      false,
    );
  });

  it("keeps display names on one header line", () => {
    assert.equal(
      formatWorkspaceFrom("Casey at TheDrinkPlace", "hello@thedrinkplace.com"),
      "Casey at TheDrinkPlace <hello@thedrinkplace.com>",
    );
    assert.equal(formatWorkspaceFrom("Bad\r\nName <x>", "hello@thedrinkplace.com").includes("\n"), false);
  });
});
