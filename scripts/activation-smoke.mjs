/**
 * Activation funnel smoke checks that don't require a live browser.
 * Companion to unit tests — verifies redirects config + critical UX source contracts.
 *
 * Full Playwright is not in this repo yet; this script is the safe E2E substitute
 * that runs in CI without sending email or touching Stripe.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✖ ${name}`);
    console.error(`    ${e.message || e}`);
  }
}

console.log("▶ activation smoke");

check("next.config has permanent industry redirects", () => {
  const src = readFileSync(join(root, "next.config.mjs"), "utf8");
  for (const path of [
    "/email-marketing-for-breweries",
    "/email-marketing-for-restaurants",
    "/email-marketing-for-nonprofits",
  ]) {
    assert.ok(src.includes(`source: "${path}"`), `missing ${path}`);
  }
  assert.ok(src.includes("permanent: true"));
});

check("campaign review confirm UX exists", () => {
  const src = readFileSync(join(root, "src/app/(app)/campaigns/[id]/page.tsx"), "utf8");
  assert.ok(src.includes("Send campaign") || src.includes("Confirm schedule"));
  assert.ok(src.includes("Before you send"));
  assert.ok(src.includes("confirmWhen"));
});

check("duplicate campaign route exists", () => {
  assert.ok(existsSync(join(root, "src/app/api/campaigns/[id]/duplicate/route.ts")));
});

check("usage thresholds start at 80%", () => {
  const src = readFileSync(join(root, "src/lib/usage-thresholds.ts"), "utf8");
  assert.ok(src.includes("[80, 90, 100]"));
  assert.ok(!src.includes("[70, 80, 90, 100]"));
});

check("onboarding is 4 steps", () => {
  const src = readFileSync(join(root, "src/app/(app)/onboarding/page.tsx"), "utf8");
  assert.ok(src.includes("Your business"));
  assert.ok(src.includes("Who you're sending from"));
  assert.ok(src.includes("Add people"));
  assert.ok(src.includes("Create your first email"));
  assert.ok(!src.includes('"Mailing address"'));
});

check("first-run dashboard Continue CTA", () => {
  const src = readFileSync(join(root, "src/app/(app)/dashboard/page.tsx"), "utf8");
  assert.ok(src.includes("Let's send your first campaign") || src.includes("Let&apos;s send your first campaign"));
  assert.ok(src.includes("Continue"));
});

check("marketing layout is not force-dynamic", () => {
  const src = readFileSync(join(root, "src/app/(marketing)/layout.tsx"), "utf8");
  assert.ok(!src.includes('dynamic = "force-dynamic"'));
});

if (failed) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll activation smoke checks passed.");
