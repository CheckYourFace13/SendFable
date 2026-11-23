#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

function classify(meta, email) {
  const bounceType = meta?.bounceType || meta?.bounce?.bounceType || null;
  const sub = meta?.bounceSubType || meta?.bounce?.bounceSubType || null;
  const diagnostic = meta?.diagnosticCode || meta?.bounce?.bouncedRecipients?.[0]?.diagnosticCode || null;
  let cls = "unknown";
  if (bounceType === "Permanent") {
    if (/mailbox|user unknown|does not exist|no such user|550 5\.1\.1/i.test(String(diagnostic || ""))) {
      cls = "invalid mailbox";
    } else if (/domain|nxdomain|no mx|dns/i.test(String(diagnostic || ""))) {
      cls = "DNS/MX";
    } else {
      cls = "invalid mailbox";
    }
  } else if (bounceType === "Transient") {
    if (/full|quota/i.test(String(diagnostic || ""))) cls = "mailbox full";
    else cls = "temporary";
  } else if (/policy|blocked|spam/i.test(String(diagnostic || ""))) {
    cls = "policy";
  }
  return { bounceType, sub, diagnostic, cls, email };
}

async function main() {
  const c = await p.acquisitionPipelineControl.findUnique({ where: { id: "default" } });
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const msgs = await p.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      sentAt: { gte: since },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
    },
    select: { status: true },
  });
  const by = {};
  for (const m of msgs) by[m.status] = (by[m.status] || 0) + 1;
  const bounced = await p.acquisitionMessage.findMany({
    where: { dryRun: false, status: "BOUNCED", sentAt: { gte: since } },
    include: {
      prospect: {
        select: {
          id: true,
          contactEmail: true,
          domain: true,
          sourceKind: true,
          sourceUrl: true,
          businessName: true,
          suppressionReason: true,
          meta: true,
        },
      },
    },
    orderBy: { bounceAt: "desc" },
  });
  const events = await p.acquisitionEvent.findMany({
    where: { type: "bounced", createdAt: { gte: since } },
    select: { createdAt: true, prospectId: true, meta: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const eventByProspect = new Map(events.map((e) => [e.prospectId, e]));

  const rows = bounced.map((m) => {
    const ev = eventByProspect.get(m.prospectId);
    const meta = (ev?.meta || {}) ;
    const classified = classify(meta, m.prospect?.contactEmail);
    return {
      messageId: m.id,
      sentAt: m.sentAt,
      bounceAt: m.bounceAt,
      sesMessageId: m.sesMessageId,
      step: m.step,
      email: m.prospect?.contactEmail,
      domain: m.prospect?.domain,
      sourceKind: m.prospect?.sourceKind,
      sourceUrl: m.prospect?.sourceUrl,
      businessName: m.prospect?.businessName,
      ...classified,
      rawMeta: meta,
    };
  });

  const sent = msgs.length;
  const bounceCount = by.BOUNCED || 0;
  console.log(
    JSON.stringify(
      {
        control: {
          paused: c?.paused,
          hardPause: c?.hardPause,
          pauseReason: c?.pauseReason,
          rampStage: c?.rampStage,
        },
        window7d: {
          since: since.toISOString(),
          sent,
          byStatus: by,
          bounceRate: sent ? bounceCount / sent : 0,
          bounceRatePct: sent ? ((bounceCount / sent) * 100).toFixed(2) + "%" : "0%",
        },
        // Auto-recovery: need bounceRate < 5% with current bounced count,
        // or wait until bounces age out. With 2 bounces, need sent > 40 for rate < 5%.
        autoRecovery: {
          currentBounces: bounceCount,
          sendsNeededForRateUnder5pctIfBouncesStay:
            bounceCount === 0 ? 0 : Math.ceil(bounceCount / 0.05) + 1 - sent,
          note:
            "Do not send to dilute. Recovery also happens when bounced rows age out of the 7d window.",
        },
        bouncedRows: rows,
      },
      null,
      2
    )
  );
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
