/**
 * Visibility / branding guards for simplified customer SMS setup.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("customer SMS setup must hide provider/technical UX", () => {
  it("customer wizard has no Telnyx / TCR / sync / sample fields", () => {
    const src = read("components/sms/text-messaging-setup-client.tsx");
    assert.doesNotMatch(src, /Telnyx|TCR|campaignBuilder|Sync status now/i);
    assert.doesNotMatch(src, /sampleMessage|optInEvidence|brandId|campaignId/i);
    assert.match(src, /Submit for text messaging approval/);
    assert.match(src, /Approval in progress|statusMessage/);
  });

  it("customer settings route exists and stays SendFable-branded", () => {
    const src = read("app/(app)/settings/text-messaging/page.tsx");
    assert.match(src, /Text messaging setup/);
    assert.doesNotMatch(src, /Telnyx|TCR/i);
  });

  it("opt-in helper never points at /privacy", () => {
    const src = read("lib/sms/ensure-sms-optin-form.ts");
    assert.doesNotMatch(src, /\/privacy/);
    assert.match(src, /\/f\/\$\{/);
  });

  it("customer API auto-generates compliance artifacts and omits provider IDs from responses", () => {
    const src = read("app/api/sms/setup/route.ts");
    assert.match(src, /ensureWorkspaceSmsOptInForm/);
    assert.match(src, /generateSmsSampleMessages/);
    assert.match(src, /generateSmsHelpStop/);
    assert.match(src, /generateSmsOptInDescription/);
    assert.match(src, /Never expose provider IDs/);
    const serializeStart = src.indexOf("function customerSerialize");
    const serializeBody = src.slice(serializeStart, src.indexOf("export async function GET"));
    assert.doesNotMatch(serializeBody, /brandId:|campaignId:/);
  });
});
