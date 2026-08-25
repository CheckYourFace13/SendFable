/**
 * Customer-acquisition outreach flags. All send/discovery paths default OFF.
 * Flip only after dry-run PASS and explicit owner approval.
 */

export const ACQUISITION_FLAG_DEFAULTS = {
  SENDFABLE_ACQUISITION_ENABLED: false,
  SENDFABLE_ACQUISITION_DISCOVERY_ENABLED: false,
  SENDFABLE_ACQUISITION_SENDING_ENABLED: false,
} as const;

export type AcquisitionBoolFlag = keyof typeof ACQUISITION_FLAG_DEFAULTS;

function truthy(raw: string | undefined): boolean {
  if (raw === undefined || raw === "") return false;
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function acquisitionFlag(name: AcquisitionBoolFlag): boolean {
  const env = process.env[name];
  if (env === undefined || env === "") return ACQUISITION_FLAG_DEFAULTS[name];
  return truthy(env);
}

export function acquisitionEnabled(): boolean {
  return acquisitionFlag("SENDFABLE_ACQUISITION_ENABLED");
}

export function acquisitionDiscoveryEnabled(): boolean {
  return acquisitionEnabled() && acquisitionFlag("SENDFABLE_ACQUISITION_DISCOVERY_ENABLED");
}

export function acquisitionSendingEnabled(): boolean {
  return acquisitionEnabled() && acquisitionFlag("SENDFABLE_ACQUISITION_SENDING_ENABLED");
}

function intEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

/** New initial outreach emails per calendar day (UTC). */
export function acquisitionDailyNewLimit(): number {
  return intEnv("SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT", 10);
}

/** Total acquisition emails (new + follow-ups) per calendar day (UTC). */
export function acquisitionDailyTotalLimit(): number {
  return intEnv("SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT", 25);
}

/** Minimum prospect score to queue/send. */
export function acquisitionMinScore(): number {
  return intEnv("SENDFABLE_ACQUISITION_MIN_SCORE", 65);
}

/** Dedicated From for acquisition (must be SES-verified). Empty = not configured. */
export function acquisitionFromAddress(): string | null {
  const raw = (process.env.SENDFABLE_ACQUISITION_FROM || "").trim();
  return raw || null;
}

export function acquisitionReplyTo(): string {
  return (
    (process.env.SENDFABLE_ACQUISITION_REPLY_TO || "").trim() ||
    (process.env.OWNER_ALERT_EMAIL || "").trim() ||
    "chris@sendfable.com"
  );
}

export function acquisitionOwnerAlertEmail(): string | null {
  const e =
    (process.env.SENDFABLE_ACQUISITION_ALERT_EMAIL || "").trim() ||
    (process.env.OWNER_ALERT_EMAIL || "").trim();
  return e || null;
}

export function acquisitionPhysicalAddress(): string {
  return (
    (process.env.SENDFABLE_PHYSICAL_ADDRESS || "").trim() ||
    "iScream Studio INC · SendFable"
  );
}

export function reportAcquisitionFlags(): Record<string, string | number | boolean | null> {
  return {
    SENDFABLE_ACQUISITION_ENABLED: acquisitionFlag("SENDFABLE_ACQUISITION_ENABLED"),
    SENDFABLE_ACQUISITION_DISCOVERY_ENABLED: acquisitionFlag(
      "SENDFABLE_ACQUISITION_DISCOVERY_ENABLED"
    ),
    SENDFABLE_ACQUISITION_SENDING_ENABLED: acquisitionFlag(
      "SENDFABLE_ACQUISITION_SENDING_ENABLED"
    ),
    SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT: acquisitionDailyNewLimit(),
    SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT: acquisitionDailyTotalLimit(),
    SENDFABLE_ACQUISITION_MIN_SCORE: acquisitionMinScore(),
    SENDFABLE_ACQUISITION_FROM: acquisitionFromAddress(),
    SENDFABLE_ACQUISITION_REPLY_TO: acquisitionReplyTo(),
  };
}
