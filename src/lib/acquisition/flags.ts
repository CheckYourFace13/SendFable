/**
 * Autonomous acquisition flags & ramp stage config.
 * Defaults keep live sending OFF until env explicitly enables.
 */

export const ACQUISITION_FLAG_DEFAULTS = {
  SENDFABLE_ACQUISITION_ENABLED: false,
  SENDFABLE_ACQUISITION_DISCOVERY_ENABLED: false,
  SENDFABLE_ACQUISITION_SENDING_ENABLED: false,
  SENDFABLE_ACQUISITION_AUTO_APPROVE: false,
  SENDFABLE_ACQUISITION_AUTO_RAMP: false,
} as const;

export type AcquisitionBoolFlag = keyof typeof ACQUISITION_FLAG_DEFAULTS;

/** Stage caps: new/day, total/day. Stage 4 is hard ceiling. */
export const ACQUISITION_RAMP_STAGES: Record<number, { newPerDay: number; totalPerDay: number }> = {
  1: { newPerDay: 5, totalPerDay: 10 },
  2: { newPerDay: 10, totalPerDay: 20 },
  3: { newPerDay: 20, totalPerDay: 35 },
  4: { newPerDay: 30, totalPerDay: 50 },
};

export const ACQUISITION_MAX_STAGE = 4;
export const ACQUISITION_MIN_BUSINESS_DAYS_PER_STAGE = 3;
/** Prefer this From when env unset — must still pass SES verification at send time. */
export const ACQUISITION_PREFERRED_FROM = "Casey at SendFable <casey@sendfable.com>";
/** Outbound address used for acquisition (alias may deliver into support@). */
export const ACQUISITION_SENDER_EMAIL = "casey@sendfable.com";
/** IMAP mailbox that receives Casey replies (Hostinger alias target). */
export const ACQUISITION_IMAP_MAILBOX_HINT = "support@sendfable.com";

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

export function acquisitionAutoApprove(): boolean {
  return acquisitionEnabled() && acquisitionFlag("SENDFABLE_ACQUISITION_AUTO_APPROVE");
}

export function acquisitionAutoRamp(): boolean {
  return acquisitionEnabled() && acquisitionFlag("SENDFABLE_ACQUISITION_AUTO_RAMP");
}

function intEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export function acquisitionRampStageFromEnv(): number {
  const s = intEnv("SENDFABLE_ACQUISITION_RAMP_STAGE", 1);
  return Math.min(ACQUISITION_MAX_STAGE, Math.max(1, s));
}

export function capsForStage(stage: number): { newPerDay: number; totalPerDay: number } {
  const s = Math.min(ACQUISITION_MAX_STAGE, Math.max(1, stage));
  return ACQUISITION_RAMP_STAGES[s] || ACQUISITION_RAMP_STAGES[1];
}

/** Effective new/day: stage caps unless explicit override env set. */
export function acquisitionDailyNewLimit(stage?: number): number {
  if (process.env.SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT) {
    return intEnv("SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT", 5);
  }
  return capsForStage(stage ?? acquisitionRampStageFromEnv()).newPerDay;
}

export function acquisitionDailyTotalLimit(stage?: number): number {
  if (process.env.SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT) {
    return intEnv("SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT", 10);
  }
  return capsForStage(stage ?? acquisitionRampStageFromEnv()).totalPerDay;
}

/** Auto-approve / send threshold — default 70. */
export function acquisitionMinScore(): number {
  return intEnv("SENDFABLE_ACQUISITION_MIN_SCORE", 70);
}

export function acquisitionFromAddress(): string {
  const raw = (process.env.SENDFABLE_ACQUISITION_FROM || "").trim();
  return raw || ACQUISITION_PREFERRED_FROM;
}

export function parseFromEmail(fromHeader: string): string | null {
  const m = fromHeader.match(/<([^>]+)>/);
  const email = (m ? m[1] : fromHeader).trim().toLowerCase();
  return email.includes("@") ? email : null;
}

export function acquisitionReplyTo(): string {
  return (
    (process.env.SENDFABLE_ACQUISITION_REPLY_TO || "").trim() ||
    ACQUISITION_SENDER_EMAIL
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

export function acquisitionImapConfigured(): boolean {
  return Boolean(
    (process.env.SENDFABLE_ACQUISITION_IMAP_HOST || "").trim() &&
      (process.env.SENDFABLE_ACQUISITION_IMAP_USER || "").trim() &&
      (process.env.SENDFABLE_ACQUISITION_IMAP_PASS || "").trim()
  );
}

/** TLS/SSL for IMAP — default true for port 993. */
export function acquisitionImapSecure(): boolean {
  const raw = (process.env.SENDFABLE_ACQUISITION_IMAP_SECURE || "").trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  const port = Number(process.env.SENDFABLE_ACQUISITION_IMAP_PORT || 993);
  return port === 993;
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
    SENDFABLE_ACQUISITION_AUTO_APPROVE: acquisitionFlag("SENDFABLE_ACQUISITION_AUTO_APPROVE"),
    SENDFABLE_ACQUISITION_AUTO_RAMP: acquisitionFlag("SENDFABLE_ACQUISITION_AUTO_RAMP"),
    SENDFABLE_ACQUISITION_RAMP_STAGE: acquisitionRampStageFromEnv(),
    SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT: acquisitionDailyNewLimit(),
    SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT: acquisitionDailyTotalLimit(),
    SENDFABLE_ACQUISITION_MIN_SCORE: acquisitionMinScore(),
    SENDFABLE_ACQUISITION_FROM: acquisitionFromAddress(),
    SENDFABLE_ACQUISITION_REPLY_TO: acquisitionReplyTo(),
    imapConfigured: acquisitionImapConfigured(),
    imapMailboxHint: ACQUISITION_IMAP_MAILBOX_HINT,
  };
}
