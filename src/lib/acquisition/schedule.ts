/** US business-hours helpers for acquisition sending (Mon–Fri, ~9–15 local). */

const US_HOLIDAYS_YYYY_MM_DD = new Set([
  // Fixed / observed common federal holidays — extend yearly as needed
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-05-25",
  "2026-06-19",
  "2026-07-03",
  "2026-07-04",
  "2026-09-07",
  "2026-11-11",
  "2026-11-26",
  "2026-12-25",
  "2027-01-01",
]);

export type ScheduleWindow = {
  ok: boolean;
  reason?: string;
};

function ymdInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function weekdayInTz(date: Date, timeZone: string): number {
  // 0=Sun … 6=Sat in that zone
  const w = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[w] ?? date.getUTCDay();
}

function hourInTz(date: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(date);
  return Number(h) % 24;
}

/** Default America/Chicago when prospect TZ unknown. */
export function defaultProspectTimeZone(state?: string | null): string {
  const s = (state || "").toUpperCase();
  const eastern = new Set([
    "CT",
    "DE",
    "FL",
    "GA",
    "IN",
    "KY",
    "MA",
    "MD",
    "ME",
    "MI",
    "NC",
    "NH",
    "NJ",
    "NY",
    "OH",
    "PA",
    "RI",
    "SC",
    "VA",
    "VT",
    "WV",
    "DC",
  ]);
  const mountain = new Set(["AZ", "CO", "ID", "MT", "NM", "UT", "WY"]);
  const pacific = new Set(["CA", "NV", "OR", "WA"]);
  const alaska = new Set(["AK"]);
  const hawaii = new Set(["HI"]);
  if (eastern.has(s)) return "America/New_York";
  if (mountain.has(s)) return "America/Denver";
  if (pacific.has(s)) return "America/Los_Angeles";
  if (alaska.has(s)) return "America/Anchorage";
  if (hawaii.has(s)) return "Pacific/Honolulu";
  return "America/Chicago";
}

export function isWithinSendWindow(
  now: Date,
  timeZone: string = "America/Chicago"
): ScheduleWindow {
  const wd = weekdayInTz(now, timeZone);
  if (wd === 0 || wd === 6) return { ok: false, reason: "weekend" };
  const day = ymdInTz(now, timeZone);
  if (US_HOLIDAYS_YYYY_MM_DD.has(day)) return { ok: false, reason: "holiday" };
  const hour = hourInTz(now, timeZone);
  if (hour < 9 || hour >= 15) return { ok: false, reason: "outside_hours" };
  return { ok: true };
}

/** Spread sends: hash id into minute offset within the hour. */
export function sendJitterMs(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 45) * 60_000; // 0–44 minutes
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export const FOLLOW_UP_1_DAYS = 4;
export const FOLLOW_UP_2_DAYS = 10; // from initial (day 0)
