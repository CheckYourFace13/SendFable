/**
 * Provider selection. Mock is the default; Telnyx is only returned when the
 * mock-provider flag is explicitly disabled AND live sending is enabled —
 * so a misconfigured single flag can never reach a live provider.
 */

import { isSmsLiveSendingEnabled, isSmsMockProviderEnabled } from "@/lib/sms/flags";
import type { SmsProvider } from "@/lib/sms/provider";
import { MockSmsProvider } from "@/lib/sms/mock-provider";
import { TelnyxSmsProvider } from "@/lib/sms/telnyx-provider";

let cached: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (cached) return cached;
  if (!isSmsMockProviderEnabled() && isSmsLiveSendingEnabled()) {
    cached = new TelnyxSmsProvider();
  } else {
    cached = new MockSmsProvider();
  }
  return cached;
}

/** Test helper: reset the memoized provider (e.g. after env changes). */
export function __resetSmsProviderForTests(): void {
  cached = null;
}
