import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { humanizeScribeChange, renderAutopilotApprovalEmail } from "../autopilot/approval-copy";

describe("Scribe approval email presentation", () => {
  it("humanizes internal page-change keys into the generated title", () => {
    assert.equal(
      humanizeScribeChange(
        'Detected a page change (substantial_new_content): “Sushi Saito Omakase Residency at Sushi Noz NYC”',
        "Tonight at Noz"
      ),
      "Sushi Saito Omakase Residency at Sushi Noz NYC"
    );
    assert.equal(
      humanizeScribeChange("New content found: Friday tap list", "ignored"),
      "Friday tap list"
    );
    assert.equal(humanizeScribeChange(null, "Weekend brunch hours"), "Weekend brunch hours");
  });

  it("renders customer-facing HTML with send now and schedule actions", () => {
    const { html, text } = renderAutopilotApprovalEmail({
      brandName: "Sushi Noz",
      changeLine: "Sushi Saito Omakase Residency at Sushi Noz NYC",
      subject: "Saito residency this month",
      audienceLabel: "Everyone subscribed",
      recipients: 184,
      previewSnippet: "A short preview of the draft campaign.",
      sendNowUrl: "https://sendfable.com/autopilot/review?t=send",
      scheduleUrl: "https://sendfable.com/autopilot/review?t=approve",
      editUrl: "https://sendfable.com/autopilot/review?t=edit",
      rejectUrl: "https://sendfable.com/autopilot/review?t=skip",
      imageUrl: "https://example.com/residency.jpg",
    });

    assert.match(html, />SendFable</);
    assert.doesNotMatch(html, /Sendfable/);
    assert.doesNotMatch(html, /substantial_new_content/);
    assert.doesNotMatch(html, /Detected a page change/i);
    assert.match(html, /Subject:/);
    assert.match(html, /Saito residency this month/);
    assert.match(html, /Audience:<\/strong><br>Everyone subscribed/);
    assert.match(html, /Estimated recipients:<\/strong><br>184/);
    assert.match(html, /SEND NOW/);
    assert.match(html, /CHOOSE DATE &amp; TIME/);
    assert.match(html, /Edit campaign/);
    assert.match(html, /Skip this campaign/);
    assert.match(html, /residency\.jpg/);
    assert.match(html, /Opening a link never sends/);
    assert.match(html, /width=device-width/);
    assert.match(html, /max-width:520px/);

    assert.match(text, /SendFable/);
    assert.match(text, /SEND NOW:/);
    assert.match(text, /CHOOSE DATE & TIME:/);
    assert.match(text, /Edit campaign:/);
    assert.match(text, /Skip this campaign:/);
    assert.match(text, /Audience: Everyone subscribed/);
    assert.match(text, /Estimated recipients: 184/);
  });

  it("uses SendFable as the platform From display name", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/autopilot/approval.ts"), "utf8");
    assert.match(src, /platformFrom\("SendFable"\)/);
    const mailer = readFileSync(join(process.cwd(), "src/lib/mailer.ts"), "utf8");
    assert.match(mailer, /displayName = "SendFable"/);
  });
});
