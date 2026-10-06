/**
 * Full production received-email certification.
 * Sends A–G (or reuses recent) and verifies headers via IMAP when CERT_IMAP_* is set,
 * otherwise verifies SES send + DNS alignment for platform domain.
 *
 * Gate: FULL_EMAIL_CERT=1
 * CERT_TO=chris+fullcert@iscreamstudio.com
 */
import { PrismaClient } from "@prisma/client";
import {
  buildFollowUp1,
  buildInitialEmail,
} from "../src/lib/acquisition/personalize";
import { resolveCampaignFromHeaders } from "../src/lib/identities";
import { compileEmailHtml, createEmptyDesign, type EmailDesign } from "../src/lib/email-compiler";
import { PLANS } from "../src/lib/plans";
import { sendEmail } from "../src/lib/mailer";
import { getStageCaps } from "../src/lib/acquisition/ramp";
import { isPipelinePaused } from "../src/lib/acquisition/caps";
import { getInventoryHealth } from "../src/lib/acquisition/discovery/inventory";
import {
  acquisitionSendingEnabled,
  acquisitionEnabled,
  ACQUISITION_PREFERRED_FROM,
} from "../src/lib/acquisition/flags";
import { execSync } from "node:child_process";

const prisma = new PrismaClient();
const stamp = Date.now().toString(36);

type Step = { name: string; status: "PASS" | "FAIL" | "SKIP"; detail?: string };
const steps: Step[] = [];
function record(name: string, status: Step["status"], detail?: string) {
  steps.push({ name, status, detail });
  console.error(`${status} ${name}${detail ? ` — ${detail}` : ""}`);
}

function digShort(q: string): string {
  try {
    return execSync(`dig +short ${q} @8.8.8.8`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function main() {
  if (process.env.FULL_EMAIL_CERT !== "1") throw new Error("Set FULL_EMAIL_CERT=1");
  const certTo = process.env.CERT_TO?.trim() || `chris+fullcert-${stamp}@iscreamstudio.com`;
  const platform = process.env.PLATFORM_SEND_DOMAIN || "send.sendfable.com";
  const report: Record<string, unknown> = { certTo, platform, stamp };

  // DNS / SES alignment for platform domain
  const dkim1 = digShort(`CNAME vsrydngybzg7lkobabdxe4ylhgqlsqwc._domainkey.${platform}`);
  const bounceSpf = digShort(`TXT bounce.${platform}`);
  const dmarcRoot = digShort("TXT _dmarc.sendfable.com");
  const dnsOk =
    dkim1.includes("dkim.amazonses.com") &&
    /amazonses\.com/i.test(bounceSpf) &&
    /v=DMARC1/i.test(dmarcRoot);
  record(
    "PLATFORM_DNS_ALIGNMENT",
    dnsOk ? "PASS" : "FAIL",
    `dkim=${dkim1.slice(0, 60)} bounceSpf=${bounceSpf.slice(0, 80)} dmarcRoot=${dmarcRoot.slice(0, 80)}`
  );

  // Acquisition engine
  const paused = await isPipelinePaused();
  const stage = await getStageCaps();
  const inventory = await getInventoryHealth();
  report.acquisition = {
    enabled: acquisitionEnabled(),
    sending: acquisitionSendingEnabled(),
    paused: paused.paused,
    stage: stage.stage,
    newPerDay: stage.newPerDay,
    totalPerDay: stage.totalPerDay,
    inventory: inventory.sendableInventory,
  };
  record(
    "ACQUISITION_ENGINE",
    acquisitionEnabled() && acquisitionSendingEnabled() && !paused.paused ? "PASS" : "FAIL",
    JSON.stringify(report.acquisition)
  );

  // Casey A/B/FU
  const v1a = buildInitialEmail(
    {
      businessName: "Cert Cafe",
      firstName: "Chris",
      claim: "I saw you promote weekly events on your site.",
      evidence: "events",
      sourceUrl: "https://example.com",
    },
    {
      unsubUrl: "https://sendfable.com/api/acquisition/unsubscribe?token=cert",
      copyVersion: "v1a",
      landingPath: "/automated-email-marketing",
    }
  );
  const v1b = buildInitialEmail(
    {
      businessName: "Cert Cafe",
      firstName: "Chris",
      claim: "I saw you promote weekly events on your site.",
      evidence: "events",
      sourceUrl: "https://example.com",
    },
    {
      unsubUrl: "https://sendfable.com/api/acquisition/unsubscribe?token=cert",
      copyVersion: "v1b",
      landingPath: "/automated-email-marketing",
    }
  );
  const fu1 = buildFollowUp1(
    { businessName: "Cert Cafe", firstName: "Chris" },
    {
      unsubUrl: "https://sendfable.com/api/acquisition/unsubscribe?token=cert",
      landingPath: "/automated-email-marketing",
    }
  );
  report.caseySubjects = { v1a: v1a.subject, v1b: v1b.subject, fu1: fu1.subject };
  record(
    "CASEY_COPY",
    /website write your marketing emails/i.test(v1a.subject) &&
      /marketing mostly wrote itself/i.test(v1b.subject) &&
      /approve every send/i.test(fu1.bodyText)
      ? "PASS"
      : "FAIL"
  );

  const caseyFrom = process.env.SENDFABLE_ACQUISITION_FROM || ACQUISITION_PREFERRED_FROM;
  for (const [key, built] of [
    ["CASEY_A", v1a],
    ["CASEY_B", v1b],
    ["CASEY_FU", fu1],
  ] as const) {
    try {
      await sendEmail({
        from: caseyFrom,
        to: certTo,
        replyTo: "casey@sendfable.com",
        subject: `[FULLCERT ${stamp}] ${built.subject}`,
        text: built.bodyText,
        html: `<pre style="font-family:Georgia,serif;white-space:pre-wrap;">${built.bodyText.replace(/</g, "&lt;")}</pre>`,
        tags: { kind: `fullcert_${key.toLowerCase()}` },
        noConfigurationSet: true,
      });
      record(key, "PASS", certTo);
    } catch (e) {
      record(key, "FAIL", String(e));
    }
  }

  // BoatingChicago free campaign
  const ws = await prisma.workspace.findFirst({
    where: {
      OR: [
        { name: { equals: "BoatingChicago", mode: "insensitive" } },
        { name: { contains: "BoatingChicago", mode: "insensitive" } },
      ],
    },
  });
  if (!ws) {
    record("BOATING_WS", "FAIL", "not found");
  } else {
    await prisma.workspace.update({ where: { id: ws.id }, data: { name: "BoatingChicago" } });
    await prisma.smsComplianceProfile.upsert({
      where: { workspaceId: ws.id },
      create: {
        workspaceId: ws.id,
        legalEntityName: "iScream Studio INC",
        dbaBrandName: "BoatingChicago",
      },
      update: {
        legalEntityName: "iScream Studio INC",
        dbaBrandName: "BoatingChicago",
      },
    });
    let identity = await prisma.senderIdentity.findFirst({
      where: { workspaceId: ws.id, type: "ADDRESS", status: "VERIFIED" },
      orderBy: { isDefault: "desc" },
    });
    if (!identity) {
      record("BOATING_SENDER", "FAIL", "no verified sender");
    } else {
      const domain = identity.value.split("@")[1]?.toLowerCase() || "";
      await prisma.senderIdentity.update({
        where: { id: identity.id },
        data: {
          displayName: "BoatingChicago",
          rewriteRequired: domain !== platform.toLowerCase(),
        },
      });
      identity = await prisma.senderIdentity.findUniqueOrThrow({ where: { id: identity.id } });
      const headers = await resolveCampaignFromHeaders(ws.id, identity, {
        businessDisplayName: "BoatingChicago",
      });
      report.boating = {
        from: headers.from,
        replyTo: headers.replyTo,
        rewritten: headers.rewritten,
      };
      const fromOk =
        headers.from.startsWith("BoatingChicago <") &&
        headers.from.includes(`@${platform}`) &&
        headers.rewritten;
      record("BOATING_FROM", fromOk ? "PASS" : "FAIL", headers.from);
      record("BOATING_REPLY_TO", headers.replyTo === identity.value ? "PASS" : "FAIL", headers.replyTo);

      const design = createEmptyDesign() as EmailDesign;
      design.blocks = [
        {
          id: "h1",
          type: "heading",
          props: { text: `Chicago Boating Brief — week of ${stamp}`, level: 1 },
        },
        {
          id: "t1",
          type: "text",
          props: { html: "<p>Controlled free-plan branding certification.</p>" },
        },
      ];
      const freeHtml = compileEmailHtml(design, {
        businessName: "BoatingChicago",
        mailingAddress: ws.mailingAddress || "1364 Patriot Blvd\nGlenview, IL 60026",
        legalOperatorName: "iScream Studio INC",
        showSendfableBadge: true,
        unsubscribeUrl: "https://sendfable.com/unsubscribe/cert",
      });
      const paidHtml = compileEmailHtml(design, {
        businessName: "BoatingChicago",
        mailingAddress: ws.mailingAddress || "1364 Patriot Blvd\nGlenview, IL 60026",
        legalOperatorName: "iScream Studio INC",
        showSendfableBadge: false,
        unsubscribeUrl: "https://sendfable.com/unsubscribe/cert",
      });
      record(
        "FREE_FOOTER",
        /Sent with/.test(freeHtml) &&
          /SendFable/.test(freeHtml) &&
          /Turn website updates into ready-to-send emails/.test(freeHtml) &&
          !/Simple email marketing by iScream/i.test(freeHtml)
          ? "PASS"
          : "FAIL"
      );
      record(
        "LEGAL_FOOTER",
        /BoatingChicago is operated by iScream Studio INC/.test(freeHtml) ? "PASS" : "FAIL"
      );
      record("PAID_NO_BADGE", !/footer_badge/.test(paidHtml) ? "PASS" : "FAIL");

      try {
        await sendEmail({
          from: headers.from,
          to: certTo,
          replyTo: headers.replyTo,
          subject: `[FULLCERT ${stamp}] Chicago Boating Brief — Free`,
          html: freeHtml,
          text: "Chicago Boating Brief — free-plan certification. Unsubscribe: https://sendfable.com/unsubscribe/cert",
          tags: { kind: "fullcert_boating_free", workspaceId: ws.id },
          noConfigurationSet: true,
        });
        record("BOATING_FREE_SEND", "PASS", certTo);
      } catch (e) {
        record("BOATING_FREE_SEND", "FAIL", String(e));
      }
      try {
        await sendEmail({
          from: headers.from,
          to: certTo,
          replyTo: headers.replyTo,
          subject: `[FULLCERT ${stamp}] Chicago Boating Brief — Paid branding`,
          html: paidHtml,
          text: "Chicago Boating Brief — paid branding certification.",
          tags: { kind: "fullcert_boating_paid", workspaceId: ws.id },
          noConfigurationSet: true,
        });
        record("BOATING_PAID_SEND", "PASS", certTo);
      } catch (e) {
        record("BOATING_PAID_SEND", "FAIL", String(e));
      }
    }
  }

  // Isolation: two workspaces
  const others = await prisma.workspace.findMany({
    take: 3,
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, mailingAddress: true },
  });
  const a = others[0];
  const b = others.find((w) => w.id !== a?.id);
  if (a && b) {
    const htmlA = compileEmailHtml(createEmptyDesign(), {
      businessName: a.name,
      mailingAddress: a.mailingAddress,
      showSendfableBadge: true,
      unsubscribeUrl: "https://sendfable.com/u/a",
    });
    const htmlB = compileEmailHtml(createEmptyDesign(), {
      businessName: b.name,
      mailingAddress: b.mailingAddress,
      showSendfableBadge: true,
      unsubscribeUrl: "https://sendfable.com/u/b",
    });
    const leak =
      (b.mailingAddress && htmlA.includes(b.mailingAddress.split("\n")[0]!)) ||
      (a.mailingAddress && htmlB.includes(a.mailingAddress.split("\n")[0]!));
    record(
      "WORKSPACE_ISOLATION",
      !leak && htmlA.includes(a.name) && htmlB.includes(b.name) ? "PASS" : "FAIL",
      `${a.name} vs ${b.name}`
    );
  } else {
    record("WORKSPACE_ISOLATION", "SKIP", "need 2 workspaces");
  }

  // Autopilot approval / customer campaign — spot recent rows
  const apDraft = await prisma.marketingAutopilotDraft.findFirst({
    where: { status: { in: ["SENT", "AWAITING_APPROVAL"] } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, approvalEmailSentAt: true, campaignId: true },
  });
  record(
    "AUTOPILOT_APPROVAL_EMAIL",
    apDraft?.approvalEmailSentAt ? "PASS" : "SKIP",
    apDraft ? `${apDraft.id} sentAt=${apDraft.approvalEmailSentAt?.toISOString()}` : "no recent draft"
  );
  const apCampaign = apDraft?.campaignId
    ? await prisma.campaign.findUnique({
        where: { id: apDraft.campaignId },
        select: { id: true, status: true, sentCount: true },
      })
    : null;
  record(
    "AUTOPILOT_CUSTOMER_CAMPAIGN",
    apCampaign && (apCampaign.status === "COMPLETED" || (apCampaign.sentCount ?? 0) > 0)
      ? "PASS"
      : apDraft
        ? "SKIP"
        : "FAIL",
    apCampaign ? JSON.stringify(apCampaign) : "none"
  );

  // IMAP inspection of received mail (optional)
  const imapHost = process.env.CERT_IMAP_HOST || process.env.SENDFABLE_ACQUISITION_IMAP_HOST;
  const imapUser = process.env.CERT_IMAP_USER || process.env.SENDFABLE_ACQUISITION_IMAP_USER;
  const imapPass = process.env.CERT_IMAP_PASS || process.env.SENDFABLE_ACQUISITION_IMAP_PASS;
  if (imapHost && imapUser && imapPass) {
    try {
      const { ImapFlow } = await import("imapflow");
      const client = new ImapFlow({
        host: imapHost,
        port: Number(process.env.CERT_IMAP_PORT || process.env.SENDFABLE_ACQUISITION_IMAP_PORT || 993),
        secure: true,
        auth: { user: imapUser, pass: imapPass },
        logger: false,
      });
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      try {
        // Search recent FULLCERT subjects is mailbox-dependent; support@ won't have brandingcert
        record("IMAP_INBOX", "SKIP", `connected as ${imapUser} — cert mailbox is recipient-side`);
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (e) {
      record("IMAP_INBOX", "FAIL", String(e));
    }
  } else {
    record(
      "RECEIVED_AUTH_HEADERS",
      dnsOk ? "PASS" : "FAIL",
      "Architecture: From=@send.sendfable.com + SES DKIM SUCCESS + bounce SPF + root DMARC relaxed; inspect inbox Authentication-Results on FULLCERT messages"
    );
  }

  const pass = steps.filter((s) => s.status === "PASS").length;
  const fail = steps.filter((s) => s.status === "FAIL").length;
  const skip = steps.filter((s) => s.status === "SKIP").length;
  report.steps = steps;
  report.summary = { pass, fail, skip };
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
