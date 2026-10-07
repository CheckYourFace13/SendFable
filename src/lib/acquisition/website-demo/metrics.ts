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

async function countDelivered(copyVersions: string[]): Promise<{ delivered: number; clicked: number }> {
  const [delivered, clicked] = await Promise.all([
    prisma.acquisitionMessage.count({
      where: {
        dryRun: false,
        step: "INITIAL",
        copyVersion: { in: copyVersions },
        deliveredAt: { not: null },
      },
    }),
    prisma.acquisitionMessage.count({
      where: {
        dryRun: false,
        step: "INITIAL",
        copyVersion: { in: copyVersions },
        clickedAt: { not: null },
      },
    }),
  ]);
  return { delivered, clicked };
}

async function countOutcomes(copyVersions: string[]): Promise<{ signup: number; paid: number }> {
  const [signup, paid] = await Promise.all([
    prisma.acquisitionProspect.count({
      where: {
        signupAt: { not: null },
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
        paidAt: { not: null },
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

/** Daily-report lines. Demo stays at zero until that track is enabled. */
export async function trackComparisonLines(): Promise<string[]> {
  try {
    const [normalD, demoD, normalO, demoO] = await Promise.all([
      countDelivered(["v1a", "v1b"]),
      countDelivered([WEBSITE_DEMO_COPY_VERSION]),
      countOutcomes(["v1a", "v1b"]),
      countOutcomes([WEBSITE_DEMO_COPY_VERSION]),
    ]);
    const normal = emptyTrackCounts();
    normal.delivered = normalD.delivered;
    normal.clicked = normalD.clicked;
    normal.signup = normalO.signup;
    normal.paid = normalO.paid;
    const demo = emptyTrackCounts();
    demo.delivered = demoD.delivered;
    demo.clicked = demoD.clicked;
    demo.signup = demoO.signup;
    demo.paid = demoO.paid;
    return ["", ...formatTrackComparison(normal, demo)];
  } catch {
    return [];
  }
}
