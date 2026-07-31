/**
 * Resolve SmsProviderOps. Mock is always returned unless live sending is
 * unlocked AND mock is disabled — Telnyx ops stay stubbed/uncredentialed.
 */

import { isSmsLiveSendingEnabled, isSmsMockProviderEnabled } from "@/lib/sms/flags";
import type { SmsProviderOps } from "@/lib/sms/provider-ops";
import { MockSmsProviderOps, mockSmsProviderOps } from "@/lib/sms/mock-provider-ops";
import { TelnyxSmsProviderOps } from "@/lib/sms/telnyx-provider-ops";

let cached: SmsProviderOps | null = null;

export function getSmsProviderOps(): SmsProviderOps {
  if (cached) return cached;
  if (!isSmsMockProviderEnabled() && isSmsLiveSendingEnabled()) {
    cached = new TelnyxSmsProviderOps();
  } else {
    cached = mockSmsProviderOps;
  }
  return cached;
}

export function __resetSmsProviderOpsForTests(): void {
  cached = null;
  if (mockSmsProviderOps instanceof MockSmsProviderOps) {
    mockSmsProviderOps.reset();
  }
}
