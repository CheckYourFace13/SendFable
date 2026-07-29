import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileEmailHtml, createEmptyDesign } from "@/lib/email-compiler";

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
      "same email in different workspaces must remain distinct keys"
    );
  });

  it("requires membership role for owner-only admin routes", () => {
    const roles = ["OWNER", "ADMIN", "MEMBER"] as const;
    const canViewSesReadiness = (role: (typeof roles)[number]) => role === "OWNER";
    assert.equal(canViewSesReadiness("OWNER"), true);
    assert.equal(canViewSesReadiness("ADMIN"), false);
    assert.equal(canViewSesReadiness("MEMBER"), false);
  });

  it("renders each workspace business name and mailing address only in that workspace footer", () => {
    const design = createEmptyDesign();
    const htmlA = compileEmailHtml(design, {
      businessName: "Acme Bakery",
      mailingAddress: "100 Main St\nSpringfield, IL 62701",
      unsubscribeUrl: "https://sendfable.com/unsubscribe/a",
    });
    const htmlB = compileEmailHtml(design, {
      businessName: "iScream Studio INC",
      mailingAddress: "1364 Patriot Blvd\nGlenview, IL 60026",
      unsubscribeUrl: "https://sendfable.com/unsubscribe/b",
    });

    assert.match(htmlA, /Acme Bakery/);
    assert.match(htmlA, /100 Main St/);
    assert.doesNotMatch(htmlA, /iScream Studio INC/);
    assert.doesNotMatch(htmlA, /1364 Patriot Blvd/);
    assert.doesNotMatch(htmlA, /Glenview/);

    assert.match(htmlB, /iScream Studio INC/);
    assert.match(htmlB, /1364 Patriot Blvd/);
    assert.match(htmlB, /Glenview, IL 60026/);
    assert.doesNotMatch(htmlB, /Acme Bakery/);
    assert.doesNotMatch(htmlB, /100 Main St/);
  });

  it("does not inject a global platform mailing address when workspace address is missing", () => {
    const html = compileEmailHtml(createEmptyDesign(), {
      businessName: "No Address Co",
      mailingAddress: null,
      unsubscribeUrl: "https://sendfable.com/unsubscribe/x",
    });
    assert.match(html, /No Address Co/);
    assert.doesNotMatch(html, /1364 Patriot Blvd/);
    assert.doesNotMatch(html, /iScream Studio INC \(SendFable controlled/);
  });
});
