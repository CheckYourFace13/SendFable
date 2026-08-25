import { prisma } from "@/lib/prisma";
import {
  acquisitionDiscoveryEnabled,
  acquisitionEnabled,
  acquisitionSendingEnabled,
} from "@/lib/acquisition/flags";
import { withAcquisitionLock } from "@/lib/acquisition/lock";
import { runDiscovery } from "@/lib/acquisition/discovery/discover";
import {
  draftMessageForProspect,
  queueQualifiedDrafts,
  sendAcquisitionMessage,
} from "@/lib/acquisition/send";
import {
  checkOutreachSafetyAndMaybePause,
  ensurePipelineControl,
  isPipelinePaused,
} from "@/lib/acquisition/caps";
import {
  defaultProspectTimeZone,
  isWithinSendWindow,
} from "@/lib/acquisition/schedule";
import { sendDailyAcquisitionReportIfDue } from "@/lib/acquisition/report";
import { acquisitionOwnerAlertEmail } from "@/lib/acquisition/flags";
import { sendEmail, platformFrom } from "@/lib/mailer";

/**
 * Single tick of the acquisition scheduler. Idempotent via locks.
 * Safe when flags are off (no-ops).
 */
export async function runAcquisitionTick(now = new Date()): Promise<{
  ran: boolean;
  actions: string[];
}> {
  if (!acquisitionEnabled()) {
    return { ran: false, actions: ["disabled"] };
  }

  const lock = await withAcquisitionLock("tick", 55, async () => {
    const actions: string[] = [];
    await ensurePipelineControl();
    await prisma.acquisitionPipelineControl.update({
      where: { id: "default" },
      data: { lastTickAt: now },
    });

    const hourUtc = now.getUTCHours();
    // Approximate US daytime windows in UTC — discovery ~12:00 UTC (7am CT),
    // send window checked per prospect TZ, daily report ~22:00 UTC (5pm CT).
    if (acquisitionDiscoveryEnabled() && hourUtc === 12) {
      const disc = await runDiscovery({ limit: 30, enrich: true });
      actions.push(`discover:${disc.upserted}/${disc.attempted}`);
      const queued = await queueQualifiedDrafts({
        limit: 20,
        dryRun: !acquisitionSendingEnabled(),
      });
      actions.push(`queue_drafts:${queued}`);
    }

    const paused = await isPipelinePaused();
    if (!paused.paused && acquisitionSendingEnabled()) {
      await checkOutreachSafetyAndMaybePause();
      const again = await isPipelinePaused();
      if (!again.paused) {
        // Process due follow-ups → draft then send
        const due = await prisma.acquisitionProspect.findMany({
          where: {
            nextFollowUpAt: { lte: now },
            status: { in: ["CONTACTED", "FOLLOW_UP_1"] },
            contactEmail: { not: null },
          },
          take: 15,
        });
        for (const p of due) {
          const step = p.status === "CONTACTED" ? "FOLLOW_UP_1" : "FOLLOW_UP_2";
          await draftMessageForProspect(p.id, step, { dryRun: false });
        }

        const candidates = await prisma.acquisitionMessage.findMany({
          where: {
            dryRun: false,
            status: { in: ["DRAFT", "SCHEDULED"] },
          },
          include: { prospect: true },
          orderBy: { createdAt: "asc" },
          take: 30,
        });

        let sent = 0;
        for (const m of candidates) {
          const tz = defaultProspectTimeZone(m.prospect.state);
          if (!isWithinSendWindow(now, tz).ok) continue;
          const r = await sendAcquisitionMessage(m.id);
          if (r.ok) {
            sent++;
            actions.push(`sent:${m.step}`);
          }
        }
        if (sent === 0) actions.push("send:none");
      }
    } else if (!acquisitionSendingEnabled()) {
      actions.push("sending_off");
    } else {
      actions.push("paused");
    }

    // Hourly-ish safety + daily report near 22:00 UTC
    if (hourUtc === 22) {
      const report = await sendDailyAcquisitionReportIfDue();
      actions.push(report.sent ? "report_sent" : `report_skip:${report.reason}`);
    }

    return actions;
  });

  if (!lock.acquired) return { ran: false, actions: ["lock_busy"] };
  return { ran: true, actions: lock.result || [] };
}

export async function alertOwner(subject: string, body: string): Promise<void> {
  const to = acquisitionOwnerAlertEmail();
  if (!to) return;
  await sendEmail({
    from: platformFrom("SendFable Acquisition"),
    to,
    subject,
    text: body,
    html: `<pre>${body.replace(/</g, "&lt;")}</pre>`,
    tags: { kind: "acquisition_alert" },
  });
}
