/**
 * Weekly acquisition optimization — surfaces recommendations; does NOT auto-rewrite strategy.
 */
import { prisma } from "@/lib/prisma";

export type WeeklyOptimization = {
  windowDays: number;
  sent: number;
  replies: number;
  positive: number;
  signups: number;
  firstSends: number;
  paid: number;
  bounces: number;
  unsubscribes: number;
  complaints: number;
  responseRate: number | null;
  positiveRate: number | null;
  signupRate: number | null;
  byCategory: Array<{ category: string; contacted: number; replies: number }>;
  recommendations: string[];
};

export async function buildWeeklyOptimization(days = 7): Promise<WeeklyOptimization> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const sent = await prisma.acquisitionMessage.count({
    where: {
      dryRun: false,
      sentAt: { gte: since },
      status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
    },
  });
  const replies = await prisma.acquisitionEvent.count({
    where: { type: "reply", createdAt: { gte: since } },
  });
  const replyEvents = await prisma.acquisitionEvent.findMany({
    where: { type: "reply", createdAt: { gte: since } },
    select: { meta: true },
  });
  const positive = replyEvents.filter(
    (e) => (e.meta as { replyClass?: string })?.replyClass === "POSITIVE"
  ).length;
  const signups = await prisma.acquisitionEvent.count({
    where: { type: "signup_matched", createdAt: { gte: since } },
  });
  const firstSends = await prisma.acquisitionProspect.count({
    where: { firstSendAt: { gte: since } },
  });
  const paid = await prisma.acquisitionProspect.count({
    where: { paidAt: { gte: since } },
  });
  const bounces = await prisma.acquisitionMessage.count({
    where: { dryRun: false, bounceAt: { gte: since } },
  });
  const unsubscribes = await prisma.acquisitionProspect.count({
    where: { status: "UNSUBSCRIBED", updatedAt: { gte: since } },
  });
  const complaints = await prisma.acquisitionMessage.count({
    where: { dryRun: false, complaintAt: { gte: since } },
  });

  const contacted = await prisma.acquisitionProspect.groupBy({
    by: ["category"],
    where: { lastContactedAt: { gte: since } },
    _count: true,
  });

  const byCategory = contacted.map((c) => ({
    category: c.category,
    contacted: c._count,
    replies: 0, // filled lightly; avoid overclaiming on tiny samples
  }));

  const recommendations: string[] = [];
  if (sent < 30) {
    recommendations.push(
      "Sample still small — do not change verticals or openers based on this week alone."
    );
  }
  if (sent >= 20 && bounces / sent >= 0.05) {
    recommendations.push("Bounce rate elevated — tighten email validation and pause new domains.");
  }
  if (complaints > 0) {
    recommendations.push("Any complaint is serious — review copy and list sources immediately.");
  }
  if (sent >= 30 && replies / sent < 0.02) {
    recommendations.push("Low reply rate — review personalization evidence quality before raising volume.");
  }
  if (signups > 0 && firstSends === 0) {
    recommendations.push("Signups without first sends — lean on product onboarding, not more outreach.");
  }
  if (recommendations.length === 0) {
    recommendations.push("No automatic strategy change recommended.");
  }

  return {
    windowDays: days,
    sent,
    replies,
    positive,
    signups,
    firstSends,
    paid,
    bounces,
    unsubscribes,
    complaints,
    responseRate: sent > 0 ? replies / sent : null,
    positiveRate: sent > 0 ? positive / sent : null,
    signupRate: sent > 0 ? signups / sent : null,
    byCategory,
    recommendations,
  };
}
