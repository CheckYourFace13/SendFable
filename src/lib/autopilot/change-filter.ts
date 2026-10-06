/**
 * Deterministic marketing-worthiness filter.
 * Runs BEFORE any AI/generation call. Cheap string heuristics only.
 */

import { AUTOPILOT_MAX_CHANGED_CHARS } from "@/lib/autopilot/types";

const MARKETING_SIGNALS =
  /\b(special|specials|sale|promo|promotion|discount|offer|event|events|tonight|weekend|limited|new\s+(beer|brew|release|menu|product|service|listing|class)|grand opening|fundraiser|register|registration|tickets?|happy hour|seasonal|announcing|now open|launch|released?|available now|while supplies|ends?\s+(soon|friday|sunday|monday|saturday)|% off|\$\d+)\b/i;

const IGNORE_ONLY =
  /^(cookie|privacy|terms|copyright|©|all rights reserved|follow us|instagram|facebook|twitter|tiktok|powered by|skip to content)$/i;

export type ChangeAssessment = {
  meaningful: boolean;
  reason: string;
  addedText: string;
  removedChars: number;
  addedChars: number;
};

/** Line-level diff: lines in `next` not in `prev` (order-preserving). */
export function addedLines(prev: string, next: string): string[] {
  const prevSet = new Set(
    prev
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean)
  );
  const out: string[] = [];
  for (const line of next.split("\n")) {
    const t = line.trim();
    if (!t || IGNORE_ONLY.test(t)) continue;
    if (!prevSet.has(t.toLowerCase())) out.push(t);
  }
  return out;
}

export function assessChange(prevText: string, nextText: string): ChangeAssessment {
  if (!prevText) {
    // First snapshot — baseline only, never generate a campaign from first fetch
    return {
      meaningful: false,
      reason: "baseline_snapshot",
      addedText: "",
      removedChars: 0,
      addedChars: 0,
    };
  }

  const added = addedLines(prevText, nextText);
  const addedText = added.join("\n").slice(0, AUTOPILOT_MAX_CHANGED_CHARS);
  const addedChars = addedText.length;
  const removedChars = Math.max(0, prevText.length - nextText.length);

  if (addedChars < 24) {
    return {
      meaningful: false,
      reason: "trivial_diff",
      addedText,
      removedChars,
      addedChars,
    };
  }

  // Ignore pure formatting / nav churn: lots removed, little marketing signal
  if (!MARKETING_SIGNALS.test(addedText) && addedChars < 80) {
    return {
      meaningful: false,
      reason: "no_marketing_signal",
      addedText,
      removedChars,
      addedChars,
    };
  }

  if (!MARKETING_SIGNALS.test(addedText) && added.length < 3) {
    return {
      meaningful: false,
      reason: "weak_signal",
      addedText,
      removedChars,
      addedChars,
    };
  }

  const reason = MARKETING_SIGNALS.test(addedText)
    ? "marketing_keywords"
    : "substantial_new_content";

  return { meaningful: true, reason, addedText, removedChars, addedChars };
}
