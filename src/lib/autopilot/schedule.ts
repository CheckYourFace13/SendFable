export const AUTOPILOT_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "UTC",
] as const;

export type AutopilotTimezone = (typeof AUTOPILOT_TIMEZONES)[number];

const ZONE_SET = new Set<string>(AUTOPILOT_TIMEZONES);

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
 * Date, time, and timezone must all be chosen. Nothing is prefilled, and
 * there is no send-now option.
 */
export function parseAutopilotSchedule(input: ScheduleInput): ScheduleResult {
  const date = (input.date || "").trim();
  const time = (input.time || "").trim();
  const timezone = (input.timezone || "").trim();
  if (!date) return { ok: false, error: "Date is required" };
  if (!time) return { ok: false, error: "Time is required" };
  if (!timezone || !ZONE_SET.has(timezone)) return { ok: false, error: "Timezone is required" };
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
  const zone = ZONE_SET.has(timezone) ? timezone : "UTC";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(at);
}

function zonedLocalToUtc(date: string, time: string, timeZone: string): Date | null {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (
    !year ||
    !month ||
    !day ||
    hour == null ||
    minute == null ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const asUtc = zonedPartsToUtc(new Date(utcGuess), timeZone);
  if (asUtc == null) return null;
  const corrected = new Date(utcGuess - (asUtc - utcGuess));
  const check = zonedPartsToUtc(corrected, timeZone);
  if (check == null) return null;
  if (Math.abs(check - utcGuess) > 60_000) return null;
  return corrected;
}

function zonedPartsToUtc(instant: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(instant);
    const bag: Record<string, string> = {};
    for (const part of parts) bag[part.type] = part.value;
    const hour = Number(bag.hour) % 24;
    return Date.UTC(
      Number(bag.year),
      Number(bag.month) - 1,
      Number(bag.day),
      hour,
      Number(bag.minute),
      Number(bag.second)
    );
  } catch {
    return null;
  }
}
