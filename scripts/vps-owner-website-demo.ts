/**
 * Owner-only personalized website demos.
 * Sends two previews to the owner. Does not email prospects or change their stats.
 *
 * Usage (on VPS):
 *   docker compose ... exec -T -w /app worker npx tsx scripts/vps-owner-website-demo.ts
 */
import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "@/lib/mailer";
import { ACQUISITION_PREFERRED_FROM, acquisitionReplyTo } from "@/lib/acquisition/flags";
import { buildWebsiteDemo } from "@/lib/acquisition/website-demo/build";
import { buildWebsiteDemoEmail } from "@/lib/acquisition/website-demo/email";
import { confirmSameSiteImage } from "@/lib/acquisition/website-demo/image";
import type { MarketingFacts } from "@/lib/acquisition/website-demo/extract";

const prisma = new PrismaClient();
const OWNER = "chris@iscreamstudio.com";
const TARGETS = [
  { domain: "nashvilleopera.org", website: "https://nashvilleopera.org/" },
  { domain: "cherrystreetpier.com", website: "https://www.cherrystreetpier.com/" },
];

async function withConfirmedImage(facts: MarketingFacts): Promise<MarketingFacts> {
  if (!facts.imageUrl) return facts;
  const check = await confirmSameSiteImage(facts.imageUrl, facts.pageUrl);
  if (check === "reject") return { ...facts, imageUrl: null, imageAlt: null };
  return facts;
}

async function main() {
  const sent: Array<Record<string, string>> = [];
  let attempts = 0;

  for (const target of TARGETS) {
    if (sent.length >= 2) break;
    attempts++;
    const prospect = await prisma.acquisitionProspect.findFirst({
      where: { domain: target.domain },
      select: { businessName: true, website: true, firstName: true },
    });
    const businessName = prospect?.businessName || target.domain;
    const website = prospect?.website || target.website;

    const built = await buildWebsiteDemo({
      website: website.startsWith("http") ? website : `https://${website}`,
      businessName,
    });
    if (!built) {
      console.log(`skip_no_facts ${businessName} ${target.domain}`);
      continue;
    }

    const facts = await withConfirmedImage(built.facts);
    const mail = buildWebsiteDemoEmail({
      businessName,
      firstName: prospect?.firstName,
      facts,
      unsubUrl: "https://sendfable.com/unsubscribe",
      ctaUrl: "https://sendfable.com/automated-email-marketing?utm_source=casey&utm_medium=email&utm_campaign=personalized_website_demo&utm_content=owner_preview",
    });

    const subject = `[OWNER PERSONALIZED DEMO FINAL] ${mail.subject}`;
    const banner = `<p style="margin:0 0 16px;padding:10px 12px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;font-family:Georgia,serif;font-size:14px;">Final owner preview. It was not sent to ${businessName}. The unsubscribe link is inert.</p>`;
    const html = mail.html.replace(/<body[^>]*>/, (open) => `${open}${banner}`);

    const result = await sendEmail({
      from: ACQUISITION_PREFERRED_FROM,
      to: OWNER,
      replyTo: acquisitionReplyTo(),
      subject,
      html,
      text: `Owner preview only. Not sent to the business.\n\n${mail.text}`,
      tags: { kind: "owner_personalized_demo" },
    });

    const file = `/tmp/owner-personalized-demo-${sent.length + 1}.html`;
    writeFileSync(file, html, "utf8");

    await prisma.acquisitionEvent.create({
      data: {
        prospectId: null,
        type: "owner_personalized_demo",
        meta: {
          businessName,
          domain: target.domain,
          sourceUrl: facts.pageUrl,
          campaignSubject: mail.campaignSubject,
          ownerSubject: subject,
          imageUsed: Boolean(facts.imageUrl),
          sesMessageId: result.messageId,
        },
      },
    });

    sent.push({
      business: businessName,
      source: facts.pageUrl,
      caseySubject: subject,
      campaignSubject: mail.campaignSubject,
      headline: facts.headline,
      date: facts.dateText || "",
      price: facts.priceText || "",
      image: facts.imageUrl || "",
      description: (facts.description || "").slice(0, 180),
      file,
      messageId: result.messageId,
    });
    console.log(`sent_owner_preview ${businessName}`);
  }

  console.log(JSON.stringify({ attempts, sent }, null, 2));
  if (sent.length < 2) process.exitCode = 2;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "owner_demo_failed");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
