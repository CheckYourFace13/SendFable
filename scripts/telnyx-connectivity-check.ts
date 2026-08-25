/**
 * Safe read-only Telnyx connectivity check CLI.
 *
 * Usage (on VPS with /opt/sendfable/.env loaded):
 *   npx tsx scripts/telnyx-connectivity-check.ts
 *
 * Never prints API keys, public keys, or profile IDs.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import {
  checkTelnyxConnectivity,
  TELNYX_EXPECTED_PROFILE_NAME,
} from "../src/lib/sms/telnyx-connectivity";

config({ path: resolve(process.cwd(), ".env") });

function line(label: string, value: string) {
  console.log(`${label}: ${value}`);
}

async function main() {
  const r = await checkTelnyxConnectivity();

  line("TELNYX API AUTH", r.apiAuth);
  line("MESSAGING PROFILE FOUND", r.messagingProfileFound);
  line("PROFILE NAME", r.profileName ?? "(none)");
  line(
    "PROFILE NAME MATCH",
    r.profileNameMatchesExpected ? `YES (${TELNYX_EXPECTED_PROFILE_NAME})` : "NO"
  );
  line(
    "PROFILE ACTIVE",
    r.profileActive === null ? "UNKNOWN" : r.profileActive ? "YES" : "NO"
  );
  line(
    "US-ONLY DESTINATIONS",
    r.usOnlyDestinations === null ? "UNKNOWN" : r.usOnlyDestinations ? "YES" : "NO"
  );
  if (r.whitelistedDestinations) {
    line("WHITELISTED_DESTINATIONS", JSON.stringify(r.whitelistedDestinations));
  }
  line(
    "ASSIGNED NUMBERS",
    r.assignedNumbers === null ? "UNKNOWN" : String(r.assignedNumbers)
  );
  line("PUBLIC KEY LOADABLE", r.publicKeyLoadable);
  line("PUBLIC/LIVE SMS FLAGS ALL FALSE", r.liveFlagsAllFalse ? "YES" : "NO");
  line("MOCK PROVIDER ENABLED", r.mockProviderEnabled ? "YES" : "NO");

  if (r.errors.length) {
    console.log("---");
    console.log("ERRORS (no secrets):");
    for (const e of r.errors) console.log(`- ${e}`);
  }

  const pass =
    r.apiAuth === "PASS" &&
    r.messagingProfileFound === "PASS" &&
    r.profileNameMatchesExpected &&
    r.profileActive === true &&
    r.usOnlyDestinations === true &&
    r.assignedNumbers === 0 &&
    r.publicKeyLoadable === "PASS" &&
    r.liveFlagsAllFalse &&
    r.mockProviderEnabled;

  console.log("---");
  line("OVERALL", pass ? "PASS" : "FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error("Connectivity check crashed (message only):", err instanceof Error ? err.message : "unknown");
  process.exit(2);
});
