/**
 * Compare normal Casey outreach with the personalized website-demo track.
 * Demo sends stay at zero until the owner enables that track.
 */

import { prisma } from "@/lib/prisma";
import { WEBSITE_DEMO_COPY_VERSION } from "@/lib/acquisition/queue-policy";

export type TrackCounts = {
  evaluated: number;
  eligible: number;
  pageFound: number;
  previewGenerated: number;
  sent: number;
  delivered: number;
  clicked: number;
  replied: number;
  positiveReply: number;
  signup: number;
  verifiedSignup: number;
  firstSend: number;
  paid: number;
};

export function emptyTrackCounts(): TrackCounts {
  return {
    evaluated: 0,
    eligible: 0,
    pageFound: 0,
    previewGenerated: 0,
    sent: 0,
    delivered: 0,
    clicked: 0,
    replied: 0,
    positiveReply: 0,
    signup: 0,
    verifiedSignup: 0,
    firstSend: 0,
    paid: 0,
  };
}

export function rate(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return part / whole;
}

export function compareAcquisitionTracks(normal: TrackCounts, demo: TrackCounts) {
  return {
    normalClickRate: rate(normal.clicked, normal.delivered),
    personalizedDemoClickRate: rate(demo.clicked, demo.delivered),
    normalSignupRate: rate(normal.signup, normal.delivered),
    personalizedDemoSignupRate: rate(demo.signup, demo.delivered),
    personalizedDemoPaidConversion: rate(demo.paid, demo.delivered),
    demoCopyVersion: WEBSITE_DEMO_COPY_VERSION,
  };
}

export function formatTrackComparison(normal: TrackCounts, demo: TrackCounts): string[] {
  const c = compareAcquisitionTracks(normal, demo);
  const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
  return [
    `Normal Casey: delivered ${normal.delivered}, clicks ${normal.clicked}, replies ${normal.replied}, signups ${normal.signup}, paid ${normal.paid}`,
    `Personalized demo: delivered ${demo.delivered}, clicks ${demo.clicked}, replies ${demo.replied}, positive replies ${demo.positiveReply}, signups ${demo.signup}, paid ${demo.paid}`,
    `Normal Casey click rate: ${pct(c.normalClickRate)} (${normal.clicked}/${normal.delivered})`,
    `Personalized demo click rate: ${pct(c.personalizedDemoClickRate)} (${demo.clicked}/${demo.delivered})`,
    `Normal Casey signup rate: ${pct(c.normalSignupRate)} (${normal.signup}/${normal.delivered})`,
    `Personalized demo signup rate: ${pct(c.personalizedDemoSignupRate)} (${demo.signup}/${demo.delivered})`,
    `Personalized demo paid conversion: ${pct(c.personalizedDemoPaidConversion)} (${demo.paid}/${demo.delivered})`,
  ];
}

export function isNormalCaseyCopy(copyVersion: string | null | undefined): boolean {
  return copyVersion === "v1a" || copyVersion === "v1b";
}

export function isWebsiteDemoCopy(copyVersion: string | null | undefined): boolean {
  return copyVersion === WEBSITE_DEMO_COPY_VERSION;
}

type DayWindow = { since?: Date };

async function countSentNew(
  copyVersions: string[],
  window: DayWindow = {}
): Promise<number> {
  return prisma.acquisitionMessage.count({
    where: {
      dryRun: false,
      step: "INITIAL",
      copyVersion: { in: copyVersions },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
      ...(window.since ? { sentAt: { gte: window.since } } : {}),
    },
  });
}

async function countDelivered(
  copyVersions: string[],
  window: DayWindow = {}
): Promise<{ delivered: number; clicked: number }> {
  const [delivered, clicked] = await Promise.all([
    prisma.acquisitionMessage.count({
      where: {
        dryRun: false,
        step: "INITIAL",
        copyVersion: { in: copyVersions },
        deliveredAt: window.since ? { gte: window.since } : { not: null },
      },
    }),
    prisma.acquisitionMessage.count({
      where: {
        dryRun: false,
        step: "INITIAL",
        copyVersion: { in: copyVersions },
        clickedAt: window.since ? { gte: window.since } : { not: null },
      },
    }),
  ]);
  return { delivered, clicked };
}

async function countReplies(
  copyVersions: string[],
  window: DayWindow = {}
): Promise<{ replied: number; positiveReply: number }> {
  if (!window.since) {
    const rows = await prisma.acquisitionProspect.findMany({
      where: {
        replyClass: { not: null },
        messages: {
          some: {
            dryRun: false,
            step: "INITIAL",
            copyVersion: { in: copyVersions },
            status: { in: ["SENT", "DELIVERED"] },
          },
        },
      },
      select: { replyClass: true },
    });
    return {
      replied: rows.length,
      positiveReply: rows.filter((row) => row.replyClass === "POSITIVE").length,
    };
  }

  const events = await prisma.acquisitionEvent.findMany({
    where: {
      type: "reply",
      createdAt: { gte: window.since },
      prospectId: { not: null },
    },
    select: { prospectId: true, meta: true },
  });
  const ids = [
    ...new Set(events.map((e) => e.prospectId).filter((id): id is string => Boolean(id))),
  ];
  if (!ids.length) return { replied: 0, positiveReply: 0 };

  const matched = await prisma.acquisitionProspect.findMany({
    where: {
      id: { in: ids },
      messages: {
        some: {
          dryRun: false,
          step: "INITIAL",
          copyVersion: { in: copyVersions },
          status: { in: ["SENT", "DELIVERED"] },
        },
      },
    },
    select: { id: true, replyClass: true },
  });
  const matchedIds = new Set(matched.map((p) => p.id));
  const dayRows = events.filter((e) => e.prospectId && matchedIds.has(e.prospectId));
  return {
    replied: dayRows.length,
    positiveReply: dayRows.filter(
      (e) => (e.meta as { replyClass?: string } | null)?.replyClass === "POSITIVE"
    ).length,
  };
}

async function countOutcomes(
  copyVersions: string[],
  window: DayWindow = {}
): Promise<{ signup: number; paid: number }> {
  const [signup, paid] = await Promise.all([
    prisma.acquisitionProspect.count({
      where: {
        signupAt: window.since ? { gte: window.since } : { not: null },
        messages: {
          some: {
            dryRun: false,
            step: "INITIAL",
            copyVersion: { in: copyVersions },
            status: { in: ["SENT", "DELIVERED"] },
          },
        },
      },
    }),
    prisma.acquisitionProspect.count({
      where: {
        paidAt: window.since ? { gte: window.since } : { not: null },
        messages: {
          some: {
            dryRun: false,
            step: "INITIAL",
            copyVersion: { in: copyVersions },
            status: { in: ["SENT", "DELIVERED"] },
          },
        },
      },
    }),
  ]);
  return { signup, paid };
}

async function countUnsubscribed(
  copyVersions: string[],
  window: DayWindow = {}
): Promise<number> {
  return prisma.acquisitionProspect.count({
    where: {
      status: "UNSUBSCRIBED",
      ...(window.since ? { updatedAt: { gte: window.since } } : {}),
      messages: {
        some: {
          dryRun: false,
          step: "INITIAL",
          copyVersion: { in: copyVersions },
          status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
        },
      },
    },
  });
}

async function trackSlice(copyVersions: string[], window: DayWindow) {
  const [sent, d, o, r, unsub] = await Promise.all([
    countSentNew(copyVersions, window),
    countDelivered(copyVersions, window),
    countOutcomes(copyVersions, window),
    countReplies(copyVersions, window),
    countUnsubscribed(copyVersions, window),
  ]);
  return {
    sent,
    delivered: d.delivered,
    clicked: d.clicked,
    replied: r.replied,
    unsubscribed: unsub,
    signup: o.signup,
    paid: o.paid,
  };
}

function formatSlice(
  label: string,
  s: Awaited<ReturnType<typeof trackSlice>>
): string {
  return `${label}: new ${s.sent}, delivered ${s.delivered}, clicks ${s.clicked}, replies ${s.replied}, unsubs ${s.unsubscribed}, signups ${s.signup}, paid ${s.paid}`;
}

/**
 * Daily-report lines for Casey vs personalized-demo.
 * When `since` is set (Chicago day start), counts are day-scoped.
 */
export async function trackComparisonLines(since?: Date): Promise<string[]> {
  try {
    const window: DayWindow = since ? { since } : {};
    const [normal, demo, v1a, v1b] = await Promise.all([
      trackSlice(["v1a", "v1b"], window),
      trackSlice([WEBSITE_DEMO_COPY_VERSION], window),
      trackSlice(["v1a"], window),
      trackSlice(["v1b"], window),
    ]);
    const totalNew = normal.sent + demo.sent;
    return [
      "",
      "— Tracks (this report window) —",
      formatSlice("Normal Casey", normal),
      formatSlice("Personalized demo", demo),
      `Total new outreach: ${totalNew} (Casey ${normal.sent} + demo ${demo.sent})`,
      formatSlice("v1a", v1a),
      formatSlice("v1b", v1b),
    ];
  } catch {
    return [];
  }
}
