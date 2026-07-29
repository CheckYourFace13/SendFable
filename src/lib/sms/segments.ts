/**
 * SMS segment calculation — correct GSM-7 / UCS-2 rules, never naive
 * JavaScript string length.
 *
 * GSM-7: 160 septets in a single segment; 153 per segment when concatenated
 *        (6 septets of UDH overhead). Extension-table characters cost 2 septets.
 * UCS-2: 70 UTF-16 code units single; 67 per segment when concatenated.
 *        Any character outside the GSM-7 tables forces the whole message to
 *        UCS-2 (emoji, smart quotes, most non-Latin scripts).
 */

export type SmsEncoding = "GSM-7" | "UCS-2";

// GSM 03.38 basic character set
const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

// GSM 03.38 extension table — each costs 2 septets (escape + char)
const GSM7_EXTENDED = "\f^{}\\[~]|€";

const GSM7_BASIC_SET = new Set(GSM7_BASIC);
const GSM7_EXTENDED_SET = new Set(GSM7_EXTENDED);

export const GSM7_SINGLE_SEGMENT_LIMIT = 160;
export const GSM7_CONCAT_SEGMENT_LIMIT = 153;
export const UCS2_SINGLE_SEGMENT_LIMIT = 70;
export const UCS2_CONCAT_SEGMENT_LIMIT = 67;

/** True when every character fits the GSM-7 basic or extension tables. */
export function isGsm7Compatible(text: string): boolean {
  for (const ch of text) {
    if (!GSM7_BASIC_SET.has(ch) && !GSM7_EXTENDED_SET.has(ch)) return false;
  }
  return true;
}

/** Septet count for a GSM-7 compatible string (extension chars cost 2). */
export function gsm7SeptetCount(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (GSM7_BASIC_SET.has(ch)) count += 1;
    else if (GSM7_EXTENDED_SET.has(ch)) count += 2;
    else throw new Error("String is not GSM-7 compatible");
  }
  return count;
}

/** UTF-16 code-unit count (what UCS-2 billing actually uses; emoji = 2). */
export function ucs2UnitCount(text: string): number {
  return text.length; // .length is code units, which is exactly UCS-2 accounting
}

export interface SegmentInfo {
  encoding: SmsEncoding;
  /** Human-visible character count (Unicode code points) */
  characterCount: number;
  /** Billable units: septets for GSM-7, UTF-16 code units for UCS-2 */
  unitCount: number;
  segments: number;
  /** Units left before another segment is added */
  remainingInSegment: number;
}

export function calculateSegments(text: string): SegmentInfo {
  const characterCount = [...text].length;
  if (text.length === 0) {
    return { encoding: "GSM-7", characterCount: 0, unitCount: 0, segments: 0, remainingInSegment: GSM7_SINGLE_SEGMENT_LIMIT };
  }

  if (isGsm7Compatible(text)) {
    const units = gsm7SeptetCount(text);
    if (units <= GSM7_SINGLE_SEGMENT_LIMIT) {
      return {
        encoding: "GSM-7",
        characterCount,
        unitCount: units,
        segments: 1,
        remainingInSegment: GSM7_SINGLE_SEGMENT_LIMIT - units,
      };
    }
    const segments = Math.ceil(units / GSM7_CONCAT_SEGMENT_LIMIT);
    return {
      encoding: "GSM-7",
      characterCount,
      unitCount: units,
      segments,
      remainingInSegment: segments * GSM7_CONCAT_SEGMENT_LIMIT - units,
    };
  }

  const units = ucs2UnitCount(text);
  if (units <= UCS2_SINGLE_SEGMENT_LIMIT) {
    return {
      encoding: "UCS-2",
      characterCount,
      unitCount: units,
      segments: 1,
      remainingInSegment: UCS2_SINGLE_SEGMENT_LIMIT - units,
    };
  }
  const segments = Math.ceil(units / UCS2_CONCAT_SEGMENT_LIMIT);
  return {
    encoding: "UCS-2",
    characterCount,
    unitCount: units,
    segments,
    remainingInSegment: segments * UCS2_CONCAT_SEGMENT_LIMIT - units,
  };
}

/**
 * Campaign estimate: every recipient's message must be RENDERED (merge fields
 * change length) before summing segments.
 */
export interface CampaignSegmentEstimate {
  recipientCount: number;
  totalSegments: number;
  /** Worst single recipient (drives "may use multiple segments" warnings) */
  maxSegmentsPerRecipient: number;
  /** Encoding is per-message; true if ANY rendered message required UCS-2 */
  anyUcs2: boolean;
}

export function estimateCampaignSegments(renderedBodies: string[]): CampaignSegmentEstimate {
  let total = 0;
  let max = 0;
  let anyUcs2 = false;
  for (const body of renderedBodies) {
    const info = calculateSegments(body);
    total += info.segments;
    if (info.segments > max) max = info.segments;
    if (info.encoding === "UCS-2") anyUcs2 = true;
  }
  return {
    recipientCount: renderedBodies.length,
    totalSegments: total,
    maxSegmentsPerRecipient: max,
    anyUcs2,
  };
}
