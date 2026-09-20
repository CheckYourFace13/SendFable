/**
 * Local certification harness: templates, goals, matrix coverage, AI pattern counts.
 * Run: npx tsx scripts/cert-rebuild-local.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PLATFORM_TEMPLATES } from "../src/lib/platform-templates";
import { compileEmailHtml } from "../src/lib/email-compiler";
import { CAMPAIGN_GOALS, recommendChannelForGoal } from "../src/lib/campaign-goals";
import { allMatrixRows } from "../src/data/competitors/pricing-matrix";
import { listPublicCompetitors } from "../src/data/competitors/catalog";
import { PLANS } from "../src/lib/plans";
import { isSmsPublicEnabled } from "../src/lib/sms/flags";

type Result = { name: string; pass: boolean; detail?: string };

const results: Result[] = [];
function check(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
}

// --- Templates ---
let tplPass = 0;
let tplFail = 0;
const tplFails: string[] = [];
for (const t of PLATFORM_TEMPLATES) {
  const issues: string[] = [];
  try {
    const html = compileEmailHtml(t.designJson, {
      businessName: "Cert Co",
      mailingAddress: "1 Main St, Chicago, IL 60601",
      showSendfableBadge: true,
    });
    if (!t.shareSlug) issues.push("missing slug");
    if (!t.name) issues.push("missing name");
    if (!t.suggestedSubjects?.length) issues.push("no subjects");
    if (!t.suggestedPreviewText) issues.push("no preview text");
    if (!html.toLowerCase().includes("unsubscribe") && !html.toLowerCase().includes("unsub")) {
      issues.push("no unsubscribe in compiled html");
    }
    if (!t.designJson.blocks.some((b) => b.type === "footer")) issues.push("no footer block");
    if (!t.designJson.blocks.some((b) => b.type === "button")) issues.push("no button");
    const blob = JSON.stringify(t.designJson);
    if (!blob.includes("first_name") && !blob.includes("{{")) issues.push("no merge tags");
    // Mobile compile: contentWidth should be set
    if (!t.designJson.settings?.contentWidth) issues.push("no contentWidth");
  } catch (e) {
    issues.push(`compile: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (issues.length) {
    tplFail++;
    tplFails.push(`${t.shareSlug}: ${issues.join("; ")}`);
  } else {
    tplPass++;
  }
}
check("all_platform_templates_compile", tplFail === 0, `${tplPass}/${PLATFORM_TEMPLATES.length}`);

// --- Goals ---
const requiredGoals = ["announce", "sale", "winback", "news", "welcome", "scratch"];
for (const id of requiredGoals) {
  check(`goal_${id}`, CAMPAIGN_GOALS.some((g) => g.id === id));
}
for (const g of CAMPAIGN_GOALS.filter((x) => x.id !== "scratch")) {
  check(
    `goal_${g.id}_has_template_categories`,
    g.templateCategories.length > 0,
    g.templateCategories.join(",")
  );
  const recEmail = recommendChannelForGoal(g.id, { smsAvailable: false });
  check(`goal_${g.id}_email_only_when_sms_off`, recEmail === "EMAIL");
}

// --- Matrix coverage ---
const requiredMatrix = [
  "sendfable",
  "mailchimp",
  "constant-contact",
  "klaviyo",
  "brevo",
  "mailerlite",
  "activecampaign",
  "hubspot",
  "omnisend",
  "getresponse",
  "kit",
  "aweber",
  "campaign-monitor",
  "sender",
  "flodesk",
  "mailjet",
  "emailoctopus",
  "beehiiv",
];
const matrixIds = new Set(allMatrixRows().map((r) => r.id));
for (const id of requiredMatrix) {
  check(`matrix_${id}`, matrixIds.has(id));
}
const sf = allMatrixRows().find((r) => r.id === "sendfable")!;
check("sf_free_contacts", sf.freeContacts === String(PLANS.FREE.contactCap));
check("sf_starter_price", sf.entryPaid.includes(String(PLANS.STARTER.monthlyPrice)));
check("sf_sms_gated_copy", /not publicly available/i.test(sf.sms));

// --- Public SMS gate ---
check("sms_public_default_false", isSmsPublicEnabled() === false);

// --- AI pattern counts in marketing tree ---
const marketingRoot = join(process.cwd(), "src", "components", "marketing");
const marketingApp = join(process.cwd(), "src", "app", "(marketing)");
function walk(dir: string, out: string[] = []): string[] {
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(tsx|ts)$/.test(name)) out.push(p);
    }
  } catch {
    /* missing */
  }
  return out;
}
const files = [...walk(marketingRoot), ...walk(marketingApp)];
const patterns: Record<string, number> = {
  emDash: 0,
  maze: 0,
  everythingYouNeed: 0,
  whetherYoure: 0,
  streamline: 0,
  effortlessly: 0,
  unlock: 0,
  supercharge: 0,
  gameChanging: 0,
};
for (const f of files) {
  const text = readFileSync(f, "utf8");
  patterns.emDash += (text.match(/\u2014/g) || []).length;
  patterns.maze += (text.match(/\bmaze\b/gi) || []).length;
  patterns.everythingYouNeed += (text.match(/everything you need/gi) || []).length;
  patterns.whetherYoure += (text.match(/whether you['']?re/gi) || []).length;
  patterns.streamline += (text.match(/\bstreamline\b/gi) || []).length;
  patterns.effortlessly += (text.match(/\beffortlessly\b/gi) || []).length;
  patterns.unlock += (text.match(/\bunlock\b/gi) || []).length;
  patterns.supercharge += (text.match(/\bsupercharge\b/gi) || []).length;
  patterns.gameChanging += (text.match(/game-?changing/gi) || []).length;
}

const failed = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    {
      templates: {
        tested: PLATFORM_TEMPLATES.length,
        pass: tplPass,
        fail: tplFail,
        fails: tplFails,
      },
      goals: CAMPAIGN_GOALS.map((g) => g.id),
      publicCompetitors: listPublicCompetitors().length,
      matrixCount: allMatrixRows().length,
      checks: { total: results.length, pass: results.length - failed.length, fail: failed.length },
      failedChecks: failed,
      aiPatterns: patterns,
      plans: {
        freeContacts: PLANS.FREE.contactCap,
        freeEmails: PLANS.FREE.emailsPerMonth,
        starter: PLANS.STARTER.monthlyPrice,
      },
      smsPublic: isSmsPublicEnabled(),
    },
    null,
    2
  )
);

if (failed.length || tplFail) process.exit(1);
