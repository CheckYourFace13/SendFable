import { createHash } from "crypto";
import { normalizeForHash } from "@/lib/autopilot/extract";

export function contentFingerprint(text: string): string {
  const normalized = normalizeForHash(text);
  return createHash("sha256").update(normalized).digest("hex");
}

/** Fingerprint of the *diff* so duplicate promotions don't re-draft. */
export function changeFingerprint(sourceUrl: string, addedText: string): string {
  const payload = `${sourceUrl}\n${normalizeForHash(addedText)}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}
