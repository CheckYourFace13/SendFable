import type { Plan } from "@prisma/client";
import type { AutopilotFrequency } from "@/lib/autopilot/types";

/**
 * Permanent monthly Autopilot creations. Free is 0.
 * A Free workspace can still start an explicit 3-month trial (1 per month).
 * Owner-internal unlimited is applied outside this function.
 */
export function autopilotAllowedFrequencies(plan: Plan): AutopilotFrequency[] {
  if (plan === "FREE") return ["WEEKLY"];
  if (plan === "STARTER") return ["DAILY", "WEEKLY"];
  return ["DAILY", "TWICE_DAILY", "WEEKLY"];
}

export function autopilotMaxDraftsPerMonth(plan: Plan): number {
  if (plan === "FREE") return 0;
  if (plan === "STARTER") return 4;
  if (plan === "GROWTH") return 8;
  if (plan === "PRO") return 16;
  return 30;
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
