const { createPublicKey } = require("crypto");

const flags = [
  "SENDFABLE_SMS_PUBLIC_ENABLED",
  "SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED",
  "SENDFABLE_SMS_BILLING_ENABLED",
  "SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED",
  "SENDFABLE_SMS_REGISTRATION_ENABLED",
  "SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED",
  "SENDFABLE_SMS_LIVE_SENDING_ENABLED",
  "SENDFABLE_SMS_INBOUND_ENABLED",
  "SENDFABLE_SMS_REPLY_ENABLED",
  "SENDFABLE_SMS_MOCK_PROVIDER_ENABLED",
];

for (const k of flags) {
  console.log(k + "=" + (process.env[k] ?? "(unset)"));
}

const pk = (process.env.TELNYX_PUBLIC_KEY || "").trim();
const api = !!(process.env.TELNYX_API_KEY || "").trim();
const mid = !!(process.env.TELNYX_MESSAGING_PROFILE_ID || "").trim();
let ok = false;
try {
  if (!pk) throw new Error("missing");
  const raw = Buffer.from(pk, "base64");
  if (raw.length === 32) {
    createPublicKey({
      key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]),
      format: "der",
      type: "spki",
    });
  } else {
    createPublicKey({ key: raw, format: "der", type: "spki" });
  }
  ok = true;
} catch {
  ok = false;
}

console.log("TELNYX_API_KEY_SET=" + (api ? "yes" : "no"));
console.log("TELNYX_MESSAGING_PROFILE_ID_SET=" + (mid ? "yes" : "no"));
console.log("TELNYX_PUBLIC_KEY_LOADABLE=" + (ok ? "PASS" : "FAIL"));
