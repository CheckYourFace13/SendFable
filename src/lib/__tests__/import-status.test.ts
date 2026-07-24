import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveImportStatus, statusForSuppressionReason } from "../migration-presets";

describe("statusForSuppressionReason", () => {
  it("maps reasons to contact statuses", () => {
    assert.equal(statusForSuppressionReason("HARD_BOUNCE"), "BOUNCED");
    assert.equal(statusForSuppressionReason("COMPLAINT"), "COMPLAINED");
    assert.equal(statusForSuppressionReason("UNSUBSCRIBED"), "UNSUBSCRIBED");
    assert.equal(statusForSuppressionReason("MANUAL"), "UNSUBSCRIBED");
    assert.equal(statusForSuppressionReason(null), "UNSUBSCRIBED");
  });
});

describe("resolveImportStatus", () => {
  it("new contact, not suppressed → incoming status applies", () => {
    assert.equal(
      resolveImportStatus({ existing: null, incoming: "SUBSCRIBED", suppressionReason: null, isSuppressed: false }),
      "SUBSCRIBED"
    );
  });

  it("new contact on global complaint list is never imported as SUBSCRIBED", () => {
    assert.equal(
      resolveImportStatus({
        existing: null,
        incoming: "SUBSCRIBED",
        suppressionReason: "COMPLAINT",
        isSuppressed: true,
      }),
      "COMPLAINED"
    );
  });

  it("new contact on global hard-bounce list imports as BOUNCED", () => {
    assert.equal(
      resolveImportStatus({
        existing: null,
        incoming: "SUBSCRIBED",
        suppressionReason: "HARD_BOUNCE",
        isSuppressed: true,
      }),
      "BOUNCED"
    );
  });

  it("workspace unsubscribe survives reimport after contact deletion", () => {
    // Contact deleted, suppression entry remains → reimport lands UNSUBSCRIBED.
    assert.equal(
      resolveImportStatus({
        existing: null,
        incoming: "SUBSCRIBED",
        suppressionReason: "UNSUBSCRIBED",
        isSuppressed: true,
      }),
      "UNSUBSCRIBED"
    );
  });

  it("existing unsubscribed contact cannot be reactivated by import", () => {
    assert.equal(
      resolveImportStatus({
        existing: "UNSUBSCRIBED",
        incoming: "SUBSCRIBED",
        suppressionReason: null,
        isSuppressed: false,
      }),
      "UNSUBSCRIBED"
    );
  });

  it("suppression escalates but never downgrades severity", () => {
    // Existing COMPLAINED + unsubscribe suppression → stays COMPLAINED.
    assert.equal(
      resolveImportStatus({
        existing: "COMPLAINED",
        incoming: "SUBSCRIBED",
        suppressionReason: "UNSUBSCRIBED",
        isSuppressed: true,
      }),
      "COMPLAINED"
    );
    // Existing UNSUBSCRIBED + complaint suppression → escalates to COMPLAINED.
    assert.equal(
      resolveImportStatus({
        existing: "UNSUBSCRIBED",
        incoming: "SUBSCRIBED",
        suppressionReason: "COMPLAINT",
        isSuppressed: true,
      }),
      "COMPLAINED"
    );
  });

  it("incoming restricted status is honored for new contacts", () => {
    assert.equal(
      resolveImportStatus({ existing: null, incoming: "BOUNCED", suppressionReason: null, isSuppressed: false }),
      "BOUNCED"
    );
  });

  it("pending confirm passes through when not suppressed", () => {
    assert.equal(
      resolveImportStatus({
        existing: null,
        incoming: "PENDING_CONFIRM",
        suppressionReason: null,
        isSuppressed: false,
      }),
      "PENDING_CONFIRM"
    );
    // ...but suppression still wins over pending.
    assert.equal(
      resolveImportStatus({
        existing: null,
        incoming: "PENDING_CONFIRM",
        suppressionReason: "COMPLAINT",
        isSuppressed: true,
      }),
      "COMPLAINED"
    );
  });
});
