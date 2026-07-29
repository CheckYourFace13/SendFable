import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GSM7_CONCAT_SEGMENT_LIMIT,
  GSM7_SINGLE_SEGMENT_LIMIT,
  UCS2_CONCAT_SEGMENT_LIMIT,
  UCS2_SINGLE_SEGMENT_LIMIT,
  calculateSegments,
  estimateCampaignSegments,
  gsm7SeptetCount,
  isGsm7Compatible,
} from "../sms/segments";
import { outboundChargeMicros } from "../sms/pricing";
import { renderSmsMergeTags } from "../sms/campaign";

describe("SMS segment calculator", () => {
  it("counts a short GSM-7 message as 1 segment", () => {
    const info = calculateSegments("Hello world");
    assert.equal(info.encoding, "GSM-7");
    assert.equal(info.segments, 1);
    assert.equal(info.unitCount, 11);
  });

  it("counts empty as 0 segments", () => {
    assert.equal(calculateSegments("").segments, 0);
  });

  it("treats extended GSM characters as 2 septets", () => {
    // "{" is in the GSM extension table → 2 septets
    assert.equal(gsm7SeptetCount("{"), 2);
    assert.equal(isGsm7Compatible("{"), true);
    assert.equal(calculateSegments("{".repeat(80)).segments, 1); // 160 septets
    assert.equal(calculateSegments("{".repeat(81)).segments, 2); // 162 → concat
  });

  it("splits GSM at 160 / 153", () => {
    const single = "a".repeat(GSM7_SINGLE_SEGMENT_LIMIT);
    assert.equal(calculateSegments(single).segments, 1);
    const two = "a".repeat(GSM7_SINGLE_SEGMENT_LIMIT + 1);
    assert.equal(calculateSegments(two).segments, 2);
    // 153 * 2 = 306 characters → 2 segments; 307 → 3
    assert.equal(calculateSegments("a".repeat(GSM7_CONCAT_SEGMENT_LIMIT * 2)).segments, 2);
    assert.equal(calculateSegments("a".repeat(GSM7_CONCAT_SEGMENT_LIMIT * 2 + 1)).segments, 3);
  });

  it("forces UCS-2 for emoji and splits at 70 / 67", () => {
    const emoji = "Hello 😀";
    assert.equal(isGsm7Compatible(emoji), false);
    const info = calculateSegments(emoji);
    assert.equal(info.encoding, "UCS-2");
    assert.equal(info.segments, 1);

    // Use a non-GSM character (smart quote) so the whole message is UCS-2.
    // A UCS-2 single segment holds 70 UTF-16 code units.
    const seventy = "\u201C".repeat(UCS2_SINGLE_SEGMENT_LIMIT);
    assert.equal(calculateSegments(seventy).encoding, "UCS-2");
    assert.equal(calculateSegments(seventy).segments, 1);
    assert.equal(calculateSegments(seventy + "\u201C").segments, 2);
    assert.equal(
      calculateSegments("\u201C".repeat(UCS2_CONCAT_SEGMENT_LIMIT * 2 + 1)).segments,
      3
    );
  });

  it("counts emoji as two UTF-16 units (never JS grapheme length alone)", () => {
    // "😀" .length === 2 in JS (surrogate pair) — UCS-2 billing agrees.
    assert.equal("😀".length, 2);
    const info = calculateSegments("😀");
    assert.equal(info.encoding, "UCS-2");
    assert.equal(info.unitCount, 2);
    assert.equal(info.characterCount, 1); // one grapheme/code point
  });

  it("renders merge fields before counting (per-recipient totals)", () => {
    const template = "Hi {{first_name}}, your code is ABC123. Reply STOP to opt out.";
    const short = renderSmsMergeTags(template, { first_name: "Al" });
    const long = renderSmsMergeTags(template, {
      first_name: "A".repeat(120),
    });
    const estimate = estimateCampaignSegments([short, long]);
    assert.equal(estimate.recipientCount, 2);
    assert.ok(estimate.totalSegments >= 2);
    assert.ok(estimate.maxSegmentsPerRecipient >= calculateSegments(short).segments);
    // Charge = total segments × Text Entry rate
    assert.equal(
      outboundChargeMicros("TEXT_ENTRY", estimate.totalSegments),
      BigInt(estimate.totalSegments) * 50_000n
    );
  });
});
