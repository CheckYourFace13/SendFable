import type { Plan } from "@prisma/client";
import type { AutopilotFrequency } from "@/lib/autopilot/types";

/**
 * Commercial placement (tiny operating cost → include early, still drive upgrades):
 * - FREE: can enable, weekly only, max 2 drafts/month
 * - STARTER: daily, 1 watched page
 * - GROWTH+: twice daily available
 */
export function autopilotAllowedFrequencies(plan: Plan): AutopilotFrequency[] {
  if (plan === "FREE") return ["WEEKLY"];
  if (plan === "STARTER") return ["DAILY", "WEEKLY"];
  return ["DAILY", "TWICE_DAILY", "WEEKLY"];
}

export function autopilotMaxDraftsPerMonth(plan: Plan): number {
  if (plan === "FREE") return 2;
  if (plan === "STARTER") return 20;
  return 60;
}

export function clampAutopilotFrequency(
  plan: Plan,
  requested: AutopilotFrequency
): AutopilotFrequency {
  const allowed = autopilotAllowedFrequencies(plan);
  return allowed.includes(requested) ? requested : allowed[0]!;
}

export function isAutopilotAvailable(plan: Plan): boolean {
  return Boolean(plan);
}
