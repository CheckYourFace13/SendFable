import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Documents the live role policy enforced by API routes.
 * Live HTTP coverage is in scripts/qa-live-matrix.ts.
 */
type Role = "OWNER" | "ADMIN" | "MEMBER";

function canInviteTeam(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function canChangeBilling(role: Role): boolean {
  // Route-level: MEMBER denied. ADMIN/OWNER allowed past role check;
  // STRIPE_OWNER_TEST / STRIPE_BILLING_ENABLED gates apply afterward.
  return role === "OWNER" || role === "ADMIN";
}

function canPatchWorkspaceSettings(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function canDeleteWorkspace(role: Role): boolean {
  return role === "OWNER";
}

function canManageSenderIdentities(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function canDoAudienceCampaignWork(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

describe("role permission policy contract", () => {
  it("OWNER has full workspace/team/billing/identity controls", () => {
    assert.equal(canInviteTeam("OWNER"), true);
    assert.equal(canChangeBilling("OWNER"), true);
    assert.equal(canPatchWorkspaceSettings("OWNER"), true);
    assert.equal(canDeleteWorkspace("OWNER"), true);
    assert.equal(canManageSenderIdentities("OWNER"), true);
    assert.equal(canDoAudienceCampaignWork("OWNER"), true);
  });

  it("ADMIN can operate workspace but cannot delete it", () => {
    assert.equal(canInviteTeam("ADMIN"), true);
    assert.equal(canChangeBilling("ADMIN"), true);
    assert.equal(canPatchWorkspaceSettings("ADMIN"), true);
    assert.equal(canDeleteWorkspace("ADMIN"), false);
    assert.equal(canManageSenderIdentities("ADMIN"), true);
    assert.equal(canDoAudienceCampaignWork("ADMIN"), true);
  });

  it("MEMBER is limited to day-to-day audience/campaign work", () => {
    assert.equal(canInviteTeam("MEMBER"), false);
    assert.equal(canChangeBilling("MEMBER"), false);
    assert.equal(canPatchWorkspaceSettings("MEMBER"), false);
    assert.equal(canDeleteWorkspace("MEMBER"), false);
    assert.equal(canManageSenderIdentities("MEMBER"), false);
    assert.equal(canDoAudienceCampaignWork("MEMBER"), true);
  });
});
