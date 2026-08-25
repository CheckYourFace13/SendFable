import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  canLoadTelnyxPublicKey,
  checkTelnyxConnectivity,
  TELNYX_EXPECTED_PROFILE_NAME,
} from "../sms/telnyx-connectivity";

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return Promise.resolve(fn()).finally(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

describe("Telnyx read-only connectivity", () => {
  it("loads a valid TELNYX_PUBLIC_KEY for Ed25519 webhook verification", async () => {
    const { publicKey } = generateKeyPairSync("ed25519");
    const pubRaw = publicKey.export({ type: "spki", format: "der" }).subarray(-32);
    await withEnv({ TELNYX_PUBLIC_KEY: pubRaw.toString("base64") }, () => {
      assert.equal(canLoadTelnyxPublicKey(), true);
    });
    await withEnv({ TELNYX_PUBLIC_KEY: "not-valid-base64!!!" }, () => {
      assert.equal(canLoadTelnyxPublicKey(), false);
    });
  });

  it("reports PASS on a successful GET-only profile + empty numbers response", async () => {
    const { publicKey } = generateKeyPairSync("ed25519");
    const pubRaw = publicKey.export({ type: "spki", format: "der" }).subarray(-32);
    const profileId = "prof_test_123";

    const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.match(url, /^https:\/\/api\.telnyx\.com\/v2\//);
      assert.ok(!url.includes("/messages"), "must not call messages endpoint");
      if (url.includes(`/messaging_profiles/${profileId}/phone_numbers`)) {
        return new Response(JSON.stringify({ data: [], meta: { total_results: 0 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith(`/messaging_profiles/${profileId}`)) {
        return new Response(
          JSON.stringify({
            data: {
              id: profileId,
              name: TELNYX_EXPECTED_PROFILE_NAME,
              enabled: true,
              whitelisted_destinations: ["US"],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("unexpected", { status: 500 });
    });

    try {
      await withEnv(
        {
          TELNYX_API_KEY: "KEY_TEST_NOT_REAL",
          TELNYX_PUBLIC_KEY: pubRaw.toString("base64"),
          TELNYX_MESSAGING_PROFILE_ID: profileId,
          SENDFABLE_SMS_PUBLIC_ENABLED: "false",
          SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED: "false",
          SENDFABLE_SMS_BILLING_ENABLED: "false",
          SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED: "false",
          SENDFABLE_SMS_REGISTRATION_ENABLED: "false",
          SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED: "false",
          SENDFABLE_SMS_LIVE_SENDING_ENABLED: "false",
          SENDFABLE_SMS_INBOUND_ENABLED: "false",
          SENDFABLE_SMS_REPLY_ENABLED: "false",
          SENDFABLE_SMS_MOCK_PROVIDER_ENABLED: "true",
        },
        async () => {
          const r = await checkTelnyxConnectivity();
          assert.equal(r.apiAuth, "PASS");
          assert.equal(r.messagingProfileFound, "PASS");
          assert.equal(r.profileName, TELNYX_EXPECTED_PROFILE_NAME);
          assert.equal(r.profileActive, true);
          assert.equal(r.usOnlyDestinations, true);
          assert.equal(r.assignedNumbers, 0);
          assert.equal(r.publicKeyLoadable, "PASS");
          assert.equal(r.liveFlagsAllFalse, true);
          assert.equal(r.mockProviderEnabled, true);
          assert.equal(r.errors.length, 0);
        }
      );
    } finally {
      fetchMock.mock.restore();
    }
  });

  it("fails auth cleanly on 401 without leaking secrets in errors", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      return new Response(JSON.stringify({ errors: [{ detail: "Unauthorized Bearer KEYSECRET" }] }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    });
    try {
      await withEnv(
        {
          TELNYX_API_KEY: "KEY_SHOULD_NOT_APPEAR",
          TELNYX_MESSAGING_PROFILE_ID: "prof_x",
          TELNYX_PUBLIC_KEY: undefined,
        },
        async () => {
          const r = await checkTelnyxConnectivity();
          assert.equal(r.apiAuth, "FAIL");
          const joined = r.errors.join(" ");
          assert.ok(!joined.includes("KEY_SHOULD_NOT_APPEAR"));
          assert.ok(!joined.includes("KEYSECRET"));
        }
      );
    } finally {
      fetchMock.mock.restore();
    }
  });
});
