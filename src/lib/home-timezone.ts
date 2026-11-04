/**
 * Workspace home timezone — global product default for schedule/send UI.
 * Stored on Workspace.timezone (product name: home timezone).
 *
 * Priority:
 * 1. workspace home timezone
 * 2. account/user timezone
 * 3. browser timezone
 * 4. UTC
 */

export const HOME_TIMEZONES = [
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

export type HomeTimezone = (typeof HOME_TIMEZONES)[number];

const ZONE_SET = new Set<string>(HOME_TIMEZONES);

export function isHomeTimezone(value: string | null | undefined): value is HomeTimezone {
  return Boolean(value && ZONE_SET.has(value.trim()));
}

/** True when the workspace has never captured a real home timezone. */
export function isMissingHomeTimezone(value: string | null | undefined): boolean {
  const z = (value || "").trim();
  return !z;
}

/**
 * Normalize an IANA zone into a supported home timezone, or null if unknown.
 * Does not guess from city/address.
 */
export function normalizeHomeTimezone(raw: string | null | undefined): HomeTimezone | null {
  const z = (raw || "").trim();
  if (!z) return null;
  if (ZONE_SET.has(z)) return z as HomeTimezone;
  return null;
}

export function resolveHomeTimezone(opts: {
  workspaceTimezone?: string | null;
  accountTimezone?: string | null;
  browserTimezone?: string | null;
}): HomeTimezone {
  for (const raw of [opts.workspaceTimezone, opts.accountTimezone, opts.browserTimezone]) {
    const normalized = normalizeHomeTimezone(raw);
    if (normalized) return normalized;
  }
  return "UTC";
}

/** Detect browser IANA timezone when available (client only). */
export function detectBrowserTimezone(): string | null {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return z || null;
  } catch {
    return null;
  }
}

export function formatInHomeTimezone(at: Date, timezone: string): string {
  const zone = normalizeHomeTimezone(timezone) || "UTC";
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

export function labelHomeTimezone(timezone: string): string {
  return (normalizeHomeTimezone(timezone) || timezone || "UTC").replace(/_/g, " ");
}

/**
 * Interpret a date (YYYY-MM-DD) + time (HH:mm) as local wall time in `timeZone`.
 */
export function zonedLocalToUtc(
  date: string,
  time: string,
  timeZone: string
): Date | null {
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

/** Parse HTML datetime-local value as wall time in the home timezone. */
export function datetimeLocalInZoneToUtc(
  datetimeLocal: string,
  timeZone: string
): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec((datetimeLocal || "").trim());
  if (!m) return null;
  return zonedLocalToUtc(m[1], m[2], timeZone);
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
