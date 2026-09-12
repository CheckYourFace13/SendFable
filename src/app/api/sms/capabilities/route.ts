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

/**
 * Authenticated SMS capability snapshot for UI gating.
 * Never enables live sends — clients must still hit server-side assertSmsFlag.
 */
export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = isSmsCodeEnabled();
  const account = isSmsAccountSignupEnabled();
  return NextResponse.json({
    codeEnabled: code,
    accountSignupEnabled: account,
    /** Customer may create Text/Both drafts and use convert UI */
    channelUiEnabled: code && account,
    liveSendingEnabled: isSmsLiveSendingEnabled(),
    numberPurchaseEnabled: isSmsNumberPurchaseEnabled(),
    registrationEnabled: isSmsRegistrationEnabled(),
    inboundEnabled: isSmsInboundEnabled(),
    publicEnabled: isSmsPublicEnabled(),
    mockProvider: isSmsMockProviderEnabled(),
    /** Honest status for customer copy */
    liveReady: false,
    statusMessage: !code
      ? "Text messaging is disabled."
      : !account
        ? "Text messaging is not activated for accounts yet."
        : !isSmsLiveSendingEnabled()
          ? "Text drafts are available; live sending awaits provider approval."
          : "Text messaging is available.",
  });
}
