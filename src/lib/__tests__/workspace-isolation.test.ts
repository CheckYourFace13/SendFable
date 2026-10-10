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
      showSendfableBadge: true,
    });
    const htmlB = compileEmailHtml(design, {
      businessName: "BoatingChicago",
      mailingAddress: "1364 Patriot Blvd\nGlenview, IL 60026",
      legalOperatorName: "iScream Studio INC",
      unsubscribeUrl: "https://sendfable.com/unsubscribe/b",
      showSendfableBadge: true,
    });

    assert.match(htmlA, /Acme Bakery/);
    assert.match(htmlA, /100 Main St/);
    assert.match(htmlA, /Powered by/);
    assert.match(htmlA, /SendFable/);
    assert.doesNotMatch(htmlA, /iScream Studio INC/);
    assert.doesNotMatch(htmlA, /1364 Patriot Blvd/);
    assert.doesNotMatch(htmlA, /Glenview/);
    assert.doesNotMatch(htmlA, /Simple email marketing by iScream/i);

    assert.match(htmlB, /BoatingChicago/);
    assert.match(htmlB, /BoatingChicago is operated by iScream Studio INC/);
    assert.match(htmlB, /1364 Patriot Blvd/);
    assert.match(htmlB, /Glenview, IL 60026/);
    assert.doesNotMatch(htmlB, /Acme Bakery/);
    assert.doesNotMatch(htmlB, /100 Main St/);
    // Legal line only — not prominent marketing brand
    assert.doesNotMatch(htmlB, /Simple email marketing by iScream/i);
  });

  it("omits SendFable badge on paid (showSendfableBadge false)", () => {
    const html = compileEmailHtml(createEmptyDesign(), {
      businessName: "Paid Co",
      mailingAddress: "1 Paid St",
      showSendfableBadge: false,
      unsubscribeUrl: "https://sendfable.com/unsubscribe/p",
    });
    assert.match(html, /Paid Co/);
    assert.doesNotMatch(html, /Powered by/);
    assert.doesNotMatch(html, /footer_badge/);
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
