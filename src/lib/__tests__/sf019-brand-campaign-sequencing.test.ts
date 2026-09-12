/**
 * Brand → Campaign sequencing + idempotency (SF-019 fix).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockSmsProviderOps } from "../sms/mock-provider-ops";
import {
  BrandNotVerifiedError,
  brandPhaseFromStatus,
  canCreateCampaignForBrandStatus,
  deriveLifecyclePhase,
  humanLifecycleMessage,
  primaryActionForPhase,
} from "../sms/registration-lifecycle";

describe("SF-019 brand→campaign sequencing helpers", () => {
  it("maps brand statuses to phases", () => {
    assert.equal(brandPhaseFromStatus("pending"), "BRAND_PENDING");
    assert.equal(brandPhaseFromStatus("submitted"), "BRAND_PENDING");
    assert.equal(brandPhaseFromStatus("approved"), "BRAND_VERIFIED");
    assert.equal(brandPhaseFromStatus("rejected"), "BRAND_FAILED");
  });

  it("allows campaign only when brand approved/verified", () => {
    assert.equal(canCreateCampaignForBrandStatus("approved"), true);
    assert.equal(canCreateCampaignForBrandStatus("pending"), false);
    assert.equal(canCreateCampaignForBrandStatus("rejected"), false);
    assert.equal(canCreateCampaignForBrandStatus("submitted"), false);
  });

  it("derives lifecycle phases without overloading PROVIDER_SUBMITTED", () => {
    assert.equal(deriveLifecyclePhase({}), "DRAFT");
    assert.equal(
      deriveLifecyclePhase({ brandId: "b1", brandStatus: "pending" }),
      "BRAND_PENDING"
    );
    assert.equal(
      deriveLifecyclePhase({ brandId: "b1", brandStatus: "approved" }),
      "BRAND_VERIFIED"
    );
    assert.equal(
      deriveLifecyclePhase({
        brandId: "b1",
        campaignId: "c1",
        brandStatus: "approved",
        campaignStatus: "pending",
      }),
      "CAMPAIGN_PENDING"
    );
    assert.equal(
      deriveLifecyclePhase({
        brandId: "b1",
        campaignId: "c1",
        brandStatus: "approved",
        campaignStatus: "approved",
      }),
      "NUMBER_READY"
    );
    assert.equal(
      deriveLifecyclePhase({
        brandId: "b1",
        campaignId: "c1",
        numberId: "n1",
        brandStatus: "approved",
        campaignStatus: "approved",
      }),
      "NUMBER_ASSIGNED"
    );
  });

  it("pending brand message is human-readable (not a Telnyx 400)", () => {
    const msg = humanLifecycleMessage("BRAND_PENDING");
    assert.match(msg, /verification is pending/i);
    assert.doesNotMatch(msg, /10015|Cannot associate/i);
  });

  it("primary actions match phases", () => {
    assert.equal(primaryActionForPhase("DRAFT").action, "submit-brand");
    assert.equal(primaryActionForPhase("BRAND_PENDING").action, "sync-brand");
    assert.equal(primaryActionForPhase("BRAND_VERIFIED").action, "create-campaign");
    assert.equal(primaryActionForPhase("CAMPAIGN_PENDING").action, "sync-campaign");
    assert.equal(primaryActionForPhase("NUMBER_READY").action, "purchase-pilot-number");
  });
});

describe("SF-019 mock provider brand→campaign guards", () => {
  it("Brand PENDING → createCampaign throws brand_not_verified (no Telnyx call)", async () => {
    const ops = new MockSmsProviderOps();
    ops.reset();
    ops.setDefaultBrandStatus("pending");
    const brand = await ops.createBrand({
      workspaceId: "ws-seq",
      legalEntityName: "iScream Studio INC",
      displayName: "SendFable",
      entityType: "PRIVATE_PROFIT",
      website: "https://sendfable.com",
      email: "support@sendfable.com",
      phone: "+13125550100",
      street: "1 Main",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      country: "US",
      vertical: "TECHNOLOGY",
    });
    assert.equal(brand.status, "pending");
    await assert.rejects(
      () =>
        ops.createCampaign({
          workspaceId: "ws-seq",
          providerBrandId: brand.providerBrandId,
          usecase: "MARKETING",
          description: "flow",
          sample1: "hi STOP rates",
          sample2: "Msg&data rates STOP",
          messageFlow: "web form opt-in",
          helpMessage: "HELP",
          optoutMessage: "STOP confirms",
        }),
      (err: unknown) =>
        err instanceof BrandNotVerifiedError && /brand_not_verified/.test(err.message)
    );
  });

  it("Brand FAILED → no campaign", async () => {
    const ops = new MockSmsProviderOps();
    ops.reset();
    ops.setDefaultBrandStatus("rejected");
    const brand = await ops.createBrand({
      workspaceId: "ws-fail",
      legalEntityName: "Fail Co",
      displayName: "Fail",
      entityType: "PRIVATE_PROFIT",
      website: "https://example.com",
      email: "a@example.com",
      phone: "+13125550100",
      street: "1 Main",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      country: "US",
      vertical: "TECHNOLOGY",
    });
    await assert.rejects(
      () =>
        ops.createCampaign({
          workspaceId: "ws-fail",
          providerBrandId: brand.providerBrandId,
          usecase: "MARKETING",
          description: "flow",
          sample1: "hi STOP",
          sample2: "rates STOP",
          messageFlow: "form",
          helpMessage: "HELP",
          optoutMessage: "STOP",
        }),
      BrandNotVerifiedError
    );
  });

  it("Brand VERIFIED → campaign called exactly once (idempotent recreate)", async () => {
    const ops = new MockSmsProviderOps();
    ops.reset();
    ops.setDefaultBrandStatus("approved");
    const brand = await ops.createBrand({
      workspaceId: "ws-ok",
      legalEntityName: "Ok Co",
      displayName: "Ok",
      entityType: "PRIVATE_PROFIT",
      website: "https://example.com",
      email: "a@example.com",
      phone: "+13125550100",
      street: "1 Main",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      country: "US",
      vertical: "TECHNOLOGY",
    });
    const camp1 = await ops.createCampaign({
      workspaceId: "ws-ok",
      providerBrandId: brand.providerBrandId,
      usecase: "MARKETING",
      description: "flow",
      sample1: "hi STOP",
      sample2: "rates STOP",
      messageFlow: "form",
      helpMessage: "HELP",
      optoutMessage: "STOP",
    });
    const camp2 = await ops.createCampaign({
      workspaceId: "ws-ok",
      providerBrandId: brand.providerBrandId,
      usecase: "MARKETING",
      description: "flow",
      sample1: "hi STOP",
      sample2: "rates STOP",
      messageFlow: "form",
      helpMessage: "HELP",
      optoutMessage: "STOP",
    });
    assert.equal(camp1.providerCampaignId, camp2.providerCampaignId);
  });

  it("repeated createBrand does not duplicate", async () => {
    const ops = new MockSmsProviderOps();
    ops.reset();
    const req = {
      workspaceId: "ws-dup",
      legalEntityName: "Dup Co",
      displayName: "Dup",
      entityType: "PRIVATE_PROFIT",
      website: "https://example.com",
      email: "a@example.com",
      phone: "+13125550100",
      street: "1 Main",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      country: "US",
      vertical: "TECHNOLOGY",
    } as const;
    const a = await ops.createBrand(req);
    const b = await ops.createBrand(req);
    assert.equal(a.providerBrandId, b.providerBrandId);
    const listed = await ops.listBrands();
    assert.equal(listed.filter((x) => x.providerBrandId === a.providerBrandId).length, 1);
  });

  it("Campaign PENDING → number purchase still possible at ops layer but phase blocks UI", () => {
    assert.equal(
      primaryActionForPhase("CAMPAIGN_PENDING").action,
      "sync-campaign"
    );
    assert.notEqual(primaryActionForPhase("CAMPAIGN_PENDING").action, "purchase-pilot-number");
    assert.equal(primaryActionForPhase("NUMBER_READY").action, "purchase-pilot-number");
  });

  it("poller transition: pending brand → verified unlocks campaign create", async () => {
    const ops = new MockSmsProviderOps();
    ops.reset();
    ops.setDefaultBrandStatus("pending");
    const brand = await ops.createBrand({
      workspaceId: "ws-poll",
      legalEntityName: "Poll Co",
      displayName: "Poll",
      entityType: "PRIVATE_PROFIT",
      website: "https://example.com",
      email: "a@example.com",
      phone: "+13125550100",
      street: "1 Main",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      country: "US",
      vertical: "TECHNOLOGY",
    });
    assert.equal(canCreateCampaignForBrandStatus(brand.status), false);
    ops.setBrandStatus(brand.providerBrandId, "approved");
    const refreshed = await ops.retrieveBrand(brand.providerBrandId);
    assert.equal(canCreateCampaignForBrandStatus(refreshed.status), true);
    const camp = await ops.createCampaign({
      workspaceId: "ws-poll",
      providerBrandId: brand.providerBrandId,
      usecase: "MARKETING",
      description: "flow",
      sample1: "hi STOP",
      sample2: "rates STOP",
      messageFlow: "form",
      helpMessage: "HELP",
      optoutMessage: "STOP",
    });
    assert.ok(camp.providerCampaignId);
  });
});
