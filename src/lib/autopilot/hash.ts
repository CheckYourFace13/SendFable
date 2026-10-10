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

/**
 * Same promotion with a small edit. Exact matches are already caught by the
 * fingerprint. This catches wording tweaks so a waiting draft is not duplicated.
 */
export function changesAreSimilar(a: string, b: string): boolean {
  const left = normalizeForHash(a);
  const right = normalizeForHash(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = Math.min(left.length, right.length);
  const longer = Math.max(left.length, right.length);
  if ((left.includes(right) || right.includes(left)) && shorter / longer >= 0.7) return true;

  const words = (text: string) =>
    new Set(text.split(/[^a-z0-9]+/).filter((word) => word.length > 2));
  const ta = words(left);
  const tb = words(right);
  if (ta.size < 4 || tb.size < 4) return false;
  let shared = 0;
  for (const word of ta) if (tb.has(word)) shared++;
  return shared / (ta.size + tb.size - shared) >= 0.72;
}
