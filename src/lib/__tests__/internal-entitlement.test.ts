import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLANS } from "@/lib/plans";
import { referralBadgeLabelHtml } from "@/lib/referral-badge";
import {
  OWNER_INTERNAL_UNLIMITED,
  softwareQuotas,
  workspaceSwitcherModel,
} from "@/lib/internal-entitlement";

function src(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("internal unlimited entitlement", () => {
  it("gives owner internal workspaces unlimited software quotas and keeps the SendFable footer", () => {
    const q = softwareQuotas({ isInternal: true, plan: "FREE" });
    assert.equal(q.entitlement, OWNER_INTERNAL_UNLIMITED);
    assert.equal(q.label, "Internal — Unlimited");
    assert.equal(q.contactCap, null);
    assert.equal(q.emailsPerMonth, null);
    assert.equal(q.autopilotDraftsPerMonth, null);
    assert.deepEqual(q.autopilotFrequencies, ["DAILY", "TWICE_DAILY", "WEEKLY"]);
    assert.equal(q.showSendfableBadge, true);
    assert.match(referralBadgeLabelHtml(), /Sent with/);
    assert.match(referralBadgeLabelHtml(), /Turn website updates into ready-to-send emails/);
  });

  it("keeps public Free quotas and the upgrade footer", () => {
    const q = softwareQuotas({ isInternal: false, plan: "FREE" });
    assert.equal(q.contactCap, PLANS.FREE.contactCap);
    assert.equal(q.emailsPerMonth, PLANS.FREE.emailsPerMonth);
    assert.equal(q.autopilotDraftsPerMonth, 2);
    assert.deepEqual(q.autopilotFrequencies, ["WEEKLY"]);
    assert.equal(q.showSendfableBadge, true);
    assert.equal(q.customDomains, false);
  });

  it("keeps public paid quotas and removes the footer badge", () => {
    const growth = softwareQuotas({ isInternal: false, plan: "GROWTH" });
    assert.equal(growth.contactCap, PLANS.GROWTH.contactCap);
    assert.equal(growth.emailsPerMonth, PLANS.GROWTH.emailsPerMonth);
    assert.equal(growth.autopilotDraftsPerMonth, 60);
    assert.equal(growth.showSendfableBadge, false);
    assert.equal(growth.customDomains, true);
    const starter = softwareQuotas({ isInternal: false, plan: "STARTER" });
    assert.equal(starter.autopilotDraftsPerMonth, 20);
    assert.equal(starter.showSendfableBadge, false);
  });

  it("does not use the internal entitlement to waive SMS provider billing", () => {
    const sms = src("src/lib/sms/campaign.ts");
    assert.equal(sms.includes("OWNER_INTERNAL_UNLIMITED"), false);
    assert.equal(sms.includes("internal-entitlement"), false);
  });
});

describe("owner business switcher", () => {
  it("lists only internal businesses and admin actions for the owner", () => {
    const model = workspaceSwitcherModel({
      isOwnerAdmin: true,
      internalWorkspaces: [
        { id: "dk", name: "DrinkKnird", isInternal: true },
        { id: "bc", name: "BoatingChicago", isInternal: true },
      ],
      memberships: [{ id: "customer", name: "Someone Else", isInternal: false }],
    });
    assert.equal(model.mode, "owner");
    assert.equal(model.showAdminLinks, true);
    assert.deepEqual(
      model.businesses.map((b) => b.name),
      ["DrinkKnird", "BoatingChicago"]
    );
  });

  it("hides internal businesses and admin links from a normal multi-workspace customer", () => {
    const model = workspaceSwitcherModel({
      isOwnerAdmin: false,
      internalWorkspaces: [{ id: "dk", name: "DrinkKnird", isInternal: true }],
      memberships: [
        { id: "a", name: "Bakery", isInternal: false },
        { id: "b", name: "Cafe", isInternal: false },
        { id: "dk", name: "DrinkKnird", isInternal: true },
      ],
    });
    assert.equal(model.mode, "member");
    assert.equal(model.showAdminLinks, false);
    assert.deepEqual(
      model.businesses.map((b) => b.name),
      ["Bakery", "Cafe"]
    );
  });

  it("shows no switcher for a customer with one workspace", () => {
    const model = workspaceSwitcherModel({
      isOwnerAdmin: false,
      internalWorkspaces: [],
      memberships: [{ id: "a", name: "Bakery", isInternal: false }],
    });
    assert.equal(model.mode, "plain");
    assert.equal(model.showAdminLinks, false);
  });

  it("keeps internal switching on the audited view-as route", () => {
    const viewAs = src("src/app/api/admin/view-as/route.ts");
    assert.match(viewAs, /if \(!ws\.isInternal\)/);
    assert.match(viewAs, /admin\.view_as\.entered/);
    const select = src("src/app/api/workspace/select/route.ts");
    assert.match(select, /workspace\.isInternal/);
    assert.match(select, /status: 403/);
    const switcher = src("src/components/app/workspace-switcher.tsx");
    assert.match(switcher, /\/api\/admin\/view-as/);
    assert.match(switcher, /\/admin\/internal/);
  });
});
