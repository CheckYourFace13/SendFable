/**
 * Provider selection for brand/campaign/number ops.
 * forceLive: use Telnyx even when mock remains the default for customer sends
 * (owner pilot registration / purchase path).
 */

import {
  isSmsLiveSendingEnabled,
  isSmsMockProviderEnabled,
  isSmsNumberPurchaseEnabled,
  isSmsRegistrationEnabled,
} from "@/lib/sms/flags";
import type { SmsProviderOps } from "@/lib/sms/provider-ops";
import { MockSmsProviderOps, mockSmsProviderOps } from "@/lib/sms/mock-provider-ops";
import { TelnyxSmsProviderOps } from "@/lib/sms/telnyx-provider-ops";

let cached: SmsProviderOps | null = null;
let cachedLive: SmsProviderOps | null = null;

function shouldUseLiveTelnyxOps(): boolean {
  if (isSmsMockProviderEnabled()) return false;
  return (
    isSmsLiveSendingEnabled() ||
    isSmsRegistrationEnabled() ||
    isSmsNumberPurchaseEnabled()
  );
}

export function getSmsProviderOps(opts?: { forceLive?: boolean }): SmsProviderOps {
  if (opts?.forceLive) {
    if (!cachedLive) cachedLive = new TelnyxSmsProviderOps();
    return cachedLive;
  }
  if (cached) return cached;
  cached = shouldUseLiveTelnyxOps() ? new TelnyxSmsProviderOps() : mockSmsProviderOps;
  return cached;
}

export function __resetSmsProviderOpsForTests(): void {
  cached = null;
  cachedLive = null;
  if (mockSmsProviderOps instanceof MockSmsProviderOps) {
    mockSmsProviderOps.reset();
  }
}
