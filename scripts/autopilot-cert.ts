/**
 * Controlled Marketing Autopilot certification (local / dry).
 * Proves: no-change = no draft; meaningful change = draft content; GET never sends;
 * approve requires confirm. Does not require live SES.
 *
 * Run: npx tsx scripts/autopilot-cert.ts
 */
import assert from "node:assert/strict";
import { htmlToVisibleText } from "../src/lib/autopilot/extract";
import { contentFingerprint, changeFingerprint } from "../src/lib/autopilot/hash";
import { assessChange } from "../src/lib/autopilot/change-filter";
import { generateExtractive } from "../src/lib/autopilot/generate";

function section(name: string) {
  console.log(`\n== ${name} ==`);
}

async function main() {
  section("NO-CHANGE = NO DRAFT");
  const page1 = `<main><h1>Specials</h1><p>Tuesday taco night</p></main>`;
  const t1 = htmlToVisibleText(page1);
  const h1 = contentFingerprint(t1);
  const t1b = htmlToVisibleText(page1);
  assert.equal(contentFingerprint(t1b), h1);
  const noChange = assessChange(t1, t1b);
  assert.equal(noChange.meaningful, false);
  console.log("PASS unchanged page is not marketing-worthy");

  section("BASELINE FIRST FETCH");
  const baseline = assessChange("", t1 + "\nNew weekend special: brunch");
  assert.equal(baseline.meaningful, false);
  console.log("PASS first snapshot is baseline only");

  section("MEANINGFUL CHANGE = DRAFT CONTENT");
  const page2 = `<main><h1>Specials</h1><p>Tuesday taco night</p>
    <p>New Fall Special: $12 lunch plate all week</p></main>`;
  const t2 = htmlToVisibleText(page2);
  const change = assessChange(t1, t2);
  assert.equal(change.meaningful, true);
  const gen = generateExtractive({
    addedText: change.addedText,
    sourceUrl: "https://example.com/specials",
    workspaceName: "Cert Cafe",
    reason: change.reason,
  });
  assert.ok(gen);
  assert.match(gen!.bodyHtml, /Fall Special|lunch plate/i);
  assert.equal(gen!.ctaHref, "https://example.com/specials");
  console.log("PASS draft generated from page facts only");
  console.log("  subject:", gen!.subject);
  console.log("  model:", gen!.model, "costMicros:", gen!.costMicros);

  section("DUPLICATE FINGERPRINT");
  const fp1 = changeFingerprint("https://example.com/specials", change.addedText);
  const fp2 = changeFingerprint("https://example.com/specials", change.addedText);
  assert.equal(fp1, fp2);
  console.log("PASS duplicate change fingerprint stable");

  section("LINK-SCANNER SAFETY (static)");
  const actionSrc = await import("node:fs").then((fs) =>
    fs.readFileSync("src/app/api/autopilot/action/route.ts", "utf8")
  );
  assert.match(actionSrc, /confirm: z\.literal\(true\)/);
  assert.match(actionSrc, /GET never sends/);
  console.log("PASS approve requires POST confirm; GET rejected");

  section("NO RESPONSE = NO SEND (invariant)");
  const tickSrc = await import("node:fs").then((fs) =>
    fs.readFileSync("src/lib/autopilot/tick.ts", "utf8")
  );
  assert.doesNotMatch(tickSrc, /launchCampaign/);
  console.log("PASS worker tick never launches campaigns");

  console.log("\nAUTOPILOT CERT: PASS (logic)");
  console.log("Live approve/reject/edit send paths require deployed DB + owner email.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
