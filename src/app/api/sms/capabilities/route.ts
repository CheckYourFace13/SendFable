import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import {
  isSmsAccountSignupEnabled,
  isSmsCodeEnabled,
  isSmsInboundEnabled,
  isSmsLiveSendingEnabled,
  isSmsMockProviderEnabled,
  isSmsNumberPurchaseEnabled,
  isSmsPublicEnabled,
  isSmsRegistrationEnabled,
} from "@/lib/sms/flags";
import { isSmsCertWorkspace } from "@/lib/sms/cert-access";

/**
 * Authenticated SMS capability snapshot for UI gating.
 * Never enables live sends — clients must still hit server-side assertSmsFlag.
 */
export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = isSmsCodeEnabled();
  const account = isSmsAccountSignupEnabled();
  const {
    isOwnerPilotWorkspace,
    isOwnerPilotLiveSendingAllowed,
    isSmsControlledAccessWorkspace,
  } = await import("@/lib/sms/pilot");
  const ownerPilot = await isOwnerPilotWorkspace(ctx.workspace.id);
  const controlled = await isSmsControlledAccessWorkspace(ctx.workspace.id);
  const certWs = isSmsCertWorkspace(ctx.workspace.id);
  const ownerLive = await isOwnerPilotLiveSendingAllowed(ctx.workspace.id);
  const channelUi = code && (account || controlled);
  const liveSending = isSmsLiveSendingEnabled() || ownerLive;
  return NextResponse.json({
    codeEnabled: code,
    accountSignupEnabled: account,
    /** Customer may create Text/Both drafts and use convert UI */
    channelUiEnabled: channelUi,
    liveSendingEnabled: liveSending,
    numberPurchaseEnabled: isSmsNumberPurchaseEnabled(),
    registrationEnabled: isSmsRegistrationEnabled() || controlled,
    inboundEnabled: isSmsInboundEnabled() || controlled,
    publicEnabled: isSmsPublicEnabled(),
    mockProvider: isSmsMockProviderEnabled() && !ownerLive && !certWs,
    ownerPilot,
    certWorkspace: certWs,
    /** Honest status for customer copy */
    liveReady: liveSending,
    statusMessage: !code
      ? "Text messaging is disabled."
      : !account && !controlled
        ? "Text messaging is not activated for accounts yet."
        : !liveSending
          ? "Text drafts are available; live sending awaits provider approval."
          : ownerPilot
            ? "Owner SMS pilot is active (public SMS still off)."
            : certWs
              ? "Controlled certification workspace (public SMS still off)."
              : "Text messaging is available.",
  });
}
