/**
 * Growth-system scheduled job stubs — produce admin review reports only.
 * Do not mutate public content or send email/SMS.
 *
 * Intended cron (owner VPS):
 *   daily:   npx tsx scripts/growth-jobs.ts daily
 *   weekly:  npx tsx scripts/growth-jobs.ts weekly
 *   monthly: npx tsx scripts/growth-jobs.ts monthly
 */

import { allEditorialItems } from "../src/data/editorial-drafts";
import { NURTURE_SEQUENCES } from "../src/data/content-pipeline";
import { SITEMAP_PATHS } from "../src/app/sitemap";
import { listPublicCompetitors } from "../src/data/competitors";

type Mode = "daily" | "weekly" | "monthly";

function modeFromArg(): Mode {
  const a = process.argv[2];
  if (a === "weekly" || a === "monthly" || a === "daily") return a;
  return "daily";
}

async function checkSitemap(): Promise<{ ok: boolean; status?: number; error?: string }> {
  const base = process.env.APP_URL || process.env.NEXTAUTH_URL || "https://sendfable.com";
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/sitemap.xml`, {
      method: "HEAD",
      redirect: "follow",
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch_failed" };
  }
}

async function main() {
  const mode = modeFromArg();
  const editorial = allEditorialItems();
  const stalePricing = editorial.filter((e) => !e.competitorPricingFresh && e.status !== "ARCHIVED");
  const ownerReview = editorial.filter((e) => e.status === "OWNER_REVIEW" || e.status === "FACT_CHECK");
  const competitors = listPublicCompetitors();

  const report: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    mode,
    note: "Review queue only — no public edits, no outreach, no nurture sends",
  };

  if (mode === "daily") {
    report.siteHealth = {
      sitemap: await checkSitemap(),
      sitemapPathCount: SITEMAP_PATHS.length + competitors.length,
    };
    report.contentReminders = {
      awaitingOwnerReview: ownerReview.map((e) => e.id),
      nurtureStillDraft: NURTURE_SEQUENCES.filter((s) => s.status !== "ACTIVE").map((s) => s.id),
    };
    report.checks = [
      "broken_links: run scripts/crawl-public-launch.ts separately",
      "failed_email_events: review SES/admin audit",
      "signup_funnel: /admin/funnel when ANALYTICS_ENABLED",
    ];
  }

  if (mode === "weekly") {
    report.search = "Paste GSC export — metrics not auto-fetched without API credentials";
    report.contentPerformance = editorial
      .filter((e) => e.status === "PUBLISHED")
      .map((e) => ({ id: e.id, path: e.targetPath, performance: e.performance || null }));
    report.competitorFreshnessQueue = competitors.map((c) => c.slug);
    report.stalePricingDrafts = stalePricing.map((e) => e.id);
  }

  if (mode === "monthly") {
    report.reviews = [
      "Mailchimp pricing snapshot refresh",
      "Major competitor pricing review",
      "Content refresh due dates",
      "SEO technical audit",
      "Referral fraud review",
      "Provider cost / margin review",
      "SMS margin review once live",
    ];
    report.refreshDue = editorial.filter((e) => e.refreshDue).map((e) => ({
      id: e.id,
      refreshDue: e.refreshDue,
    }));
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
