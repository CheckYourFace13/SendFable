/**
 * Resolve SmsProviderOps.
 * Use Telnyx when mock is off AND any live lifecycle flag is on
 * (registration, number purchase, or live sending).
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

function useLiveTelnyxOps(): boolean {
  if (isSmsMockProviderEnabled()) return false;
  return (
    isSmsLiveSendingEnabled() ||
    isSmsRegistrationEnabled() ||
    isSmsNumberPurchaseEnabled()
  );
}

export function getSmsProviderOps(): SmsProviderOps {
  if (cached) return cached;
  cached = useLiveTelnyxOps() ? new TelnyxSmsProviderOps() : mockSmsProviderOps;
  return cached;
}

export function __resetSmsProviderOpsForTests(): void {
  cached = null;
  if (mockSmsProviderOps instanceof MockSmsProviderOps) {
    mockSmsProviderOps.reset();
  }
}
