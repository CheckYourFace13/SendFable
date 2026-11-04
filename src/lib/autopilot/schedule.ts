import {
  HOME_TIMEZONES,
  type HomeTimezone,
  formatInHomeTimezone,
  normalizeHomeTimezone,
  resolveHomeTimezone,
  zonedLocalToUtc,
} from "@/lib/home-timezone";

/** @deprecated Prefer HOME_TIMEZONES — kept for Scribe schedule UI imports. */
export const AUTOPILOT_TIMEZONES = HOME_TIMEZONES;
export type AutopilotTimezone = HomeTimezone;

export { resolveHomeTimezone as resolveDefaultTimezone };

export type ScheduleInput = {
  date?: string | null;
  time?: string | null;
  timezone?: string | null;
  now?: Date;
};

export type ScheduleResult =
  | { ok: true; at: Date; timezone: AutopilotTimezone }
  | { ok: false; error: string };

/**
 * Date, time, and timezone must all be chosen for schedule-later.
 * Timezone may be prefilled from the workspace home timezone; send-now is separate.
 */
export function parseAutopilotSchedule(input: ScheduleInput): ScheduleResult {
  const date = (input.date || "").trim();
  const time = (input.time || "").trim();
  const timezone = (input.timezone || "").trim();
  if (!date) return { ok: false, error: "Date is required" };
  if (!time) return { ok: false, error: "Time is required" };
  if (!normalizeHomeTimezone(timezone)) return { ok: false, error: "Timezone is required" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Date is required" };
  if (!/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: "Time is required" };

  const at = zonedLocalToUtc(date, time, timezone);
  if (!at) return { ok: false, error: "Choose a valid date and time" };
  const now = input.now ?? new Date();
  if (at.getTime() < now.getTime() + 60_000) {
    return { ok: false, error: "Choose a future date and time" };
  }
  return { ok: true, at, timezone: timezone as AutopilotTimezone };
}

export function formatScheduledWhen(at: Date, timezone: string): string {
  return formatInHomeTimezone(at, timezone);
}
