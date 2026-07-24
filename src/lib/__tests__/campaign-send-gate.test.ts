import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAMPAIGN_SEND_DISABLED_MESSAGE,
  CampaignSendDisabledError,
  assertCampaignSendEnabled,
  assertSesControlledTestEnabled,
  isCampaignSendEnabled,
  isSesControlledTestEnabled,
} from "../campaign-send-gate";

describe("campaign-send-gate", () => {
  const prevCampaign = process.env.CAMPAIGN_SEND_ENABLED;
  const prevTest = process.env.SES_CONTROLLED_TEST_ENABLED;

  afterEach(() => {
    if (prevCampaign === undefined) delete process.env.CAMPAIGN_SEND_ENABLED;
    else process.env.CAMPAIGN_SEND_ENABLED = prevCampaign;
    if (prevTest === undefined) delete process.env.SES_CONTROLLED_TEST_ENABLED;
    else process.env.SES_CONTROLLED_TEST_ENABLED = prevTest;
  });

  beforeEach(() => {
    delete process.env.CAMPAIGN_SEND_ENABLED;
    delete process.env.SES_CONTROLLED_TEST_ENABLED;
  });

  it("defaults CAMPAIGN_SEND_ENABLED to false when missing", () => {
    delete process.env.CAMPAIGN_SEND_ENABLED;
    assert.equal(isCampaignSendEnabled(), false);
  });

  it("defaults CAMPAIGN_SEND_ENABLED to false when empty", () => {
    process.env.CAMPAIGN_SEND_ENABLED = "";
    assert.equal(isCampaignSendEnabled(), false);
    process.env.CAMPAIGN_SEND_ENABLED = "   ";
    assert.equal(isCampaignSendEnabled(), false);
  });

  it("treats false/0/no as disabled", () => {
    for (const v of ["false", "0", "no", "FALSE", "off"]) {
      process.env.CAMPAIGN_SEND_ENABLED = v;
      assert.equal(isCampaignSendEnabled(), false, v);
    }
  });

  it("enables only for true/1/yes", () => {
    for (const v of ["true", "1", "yes", "TRUE", " Yes "]) {
      process.env.CAMPAIGN_SEND_ENABLED = v;
      assert.equal(isCampaignSendEnabled(), true, v);
    }
  });

  it("assertCampaignSendEnabled throws exact 403 message when disabled", () => {
    process.env.CAMPAIGN_SEND_ENABLED = "false";
    assert.throws(
      () => assertCampaignSendEnabled(),
      (err: unknown) => {
        assert.ok(err instanceof CampaignSendDisabledError);
        assert.equal(err.message, CAMPAIGN_SEND_DISABLED_MESSAGE);
        assert.equal(err.message, "Campaign delivery is not activated yet.");
        assert.equal(err.status, 403);
        return true;
      }
    );
  });

  it("assertCampaignSendEnabled passes when enabled", () => {
    process.env.CAMPAIGN_SEND_ENABLED = "true";
    assert.doesNotThrow(() => assertCampaignSendEnabled());
  });

  it("defaults SES_CONTROLLED_TEST_ENABLED to false and does not unlock campaign send", () => {
    delete process.env.SES_CONTROLLED_TEST_ENABLED;
    process.env.CAMPAIGN_SEND_ENABLED = "false";
    assert.equal(isSesControlledTestEnabled(), false);
    assert.equal(isCampaignSendEnabled(), false);
    assert.throws(() => assertSesControlledTestEnabled(), /controlled test is not enabled/i);
  });

  it("SES_CONTROLLED_TEST_ENABLED can be true while campaign send stays false", () => {
    process.env.CAMPAIGN_SEND_ENABLED = "false";
    process.env.SES_CONTROLLED_TEST_ENABLED = "true";
    assert.equal(isSesControlledTestEnabled(), true);
    assert.equal(isCampaignSendEnabled(), false);
    assert.doesNotThrow(() => assertSesControlledTestEnabled());
    assert.throws(() => assertCampaignSendEnabled(), CampaignSendDisabledError);
  });
});

describe("campaign-send-gate wiring (source)", () => {
  it("guards launch, resume, and per-recipient send in campaign-send.ts", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/campaign-send.ts"), "utf8");
    assert.match(src, /assertCampaignSendEnabled/);
    const launchIdx = src.indexOf("export async function launchCampaign");
    const resumeIdx = src.indexOf("export async function resumeCampaign");
    const sendIdx = src.indexOf("export async function sendOneRecipient");
    const sendEmailIdx = src.indexOf("await sendEmail(");
    assert.ok(launchIdx >= 0 && resumeIdx >= 0 && sendIdx >= 0 && sendEmailIdx >= 0);

    const launchBody = src.slice(launchIdx, resumeIdx > launchIdx ? resumeIdx : undefined);
    assert.match(launchBody, /assertCampaignSendEnabled\(\)/);

    const resumeBody = src.slice(resumeIdx);
    assert.match(resumeBody, /assertCampaignSendEnabled\(\)/);

    const sendBody = src.slice(sendIdx, sendEmailIdx);
    assert.match(sendBody, /assertCampaignSendEnabled\(\)/);
    assert.ok(
      sendBody.indexOf("assertCampaignSendEnabled()") < sendBody.length,
      "gate must run before sendEmail"
    );
  });

  it("guards launch API and resume API with 403 message", () => {
    const launch = readFileSync(
      join(process.cwd(), "src/app/api/campaigns/[id]/launch/route.ts"),
      "utf8"
    );
    const resume = readFileSync(
      join(process.cwd(), "src/app/api/campaigns/[id]/resume/route.ts"),
      "utf8"
    );
    assert.match(launch, /CAMPAIGN_SEND_DISABLED_MESSAGE/);
    assert.match(launch, /isCampaignSendEnabled/);
    assert.match(launch, /status: 403/);
    assert.match(resume, /CAMPAIGN_SEND_DISABLED_MESSAGE/);
    assert.match(resume, /isCampaignSendEnabled/);
    assert.match(resume, /403/);
  });

  it("scheduled dispatcher uses launchCampaign (inherits gate)", () => {
    const worker = readFileSync(join(process.cwd(), "src/worker/index.ts"), "utf8");
    assert.match(worker, /launchCampaign/);
    assert.match(worker, /SCHEDULED/);
  });

  it("controlled test script requires SES_CONTROLLED_TEST_ENABLED", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts/ses-controlled-test.ts"),
      "utf8"
    );
    assert.match(script, /assertSesControlledTestEnabled|isSesControlledTestEnabled/);
  });
});
