/**
 * Owner-only SMS pilot configuration (SF-019I).
 * Prepared but never enabled until explicit owner approval after Telnyx access.
 */

export const OWNER_SMS_PILOT = {
  enabledEnv: "SENDFABLE_SMS_OWNER_PILOT_ENABLED",
  /** Must match the iScream / SendFable operator workspace id when set */
  workspaceIdEnv: "SENDFABLE_SMS_OWNER_PILOT_WORKSPACE_ID",
  maxWorkspaces: 1,
  maxNumbers: 1,
  /** Comma-separated E.164 allowlist */
  recipientAllowlistEnv: "SENDFABLE_SMS_OWNER_PILOT_ALLOWLIST",
  maxOutboundSegmentsTotal: 25,
  maxInboundSegmentsTotal: 25,
  maxRecipients: 2,
  requireManualAdminApproval: true,
  killSwitchEnv: "SENDFABLE_SMS_OWNER_PILOT_KILL_SWITCH",
} as const;

export function isOwnerSmsPilotEnabled(): boolean {
  const v = (process.env[OWNER_SMS_PILOT.enabledEnv] || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isOwnerSmsPilotKillSwitchOn(): boolean {
  const v = (process.env[OWNER_SMS_PILOT.killSwitchEnv] || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function ownerPilotWorkspaceId(): string | null {
  return process.env[OWNER_SMS_PILOT.workspaceIdEnv]?.trim() || null;
}

export function ownerPilotAllowlist(): string[] {
  const raw = process.env[OWNER_SMS_PILOT.recipientAllowlistEnv]?.trim() || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function assertOwnerPilotSendAllowed(input: {
  workspaceId: string;
  toE164: string;
  outboundSegmentsSoFar: number;
  segmentsThisMessage: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!isOwnerSmsPilotEnabled()) {
    return { ok: false, reason: "owner pilot is not enabled" };
  }
  if (isOwnerSmsPilotKillSwitchOn()) {
    return { ok: false, reason: "owner pilot kill switch is on" };
  }
  const ws = ownerPilotWorkspaceId();
  if (!ws || ws !== input.workspaceId) {
    return { ok: false, reason: "workspace is not the owner pilot workspace" };
  }
  const allow = ownerPilotAllowlist();
  if (allow.length === 0 || !allow.includes(input.toE164)) {
    return { ok: false, reason: "destination not on owner pilot allowlist" };
  }
  if (allow.length > OWNER_SMS_PILOT.maxRecipients) {
    return { ok: false, reason: "allowlist exceeds max recipients" };
  }
  if (
    input.outboundSegmentsSoFar + input.segmentsThisMessage >
    OWNER_SMS_PILOT.maxOutboundSegmentsTotal
  ) {
    return { ok: false, reason: "owner pilot outbound segment cap reached" };
  }
  return { ok: true };
}
