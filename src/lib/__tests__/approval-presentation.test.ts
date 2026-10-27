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
      "New content found: Sushi Saito Omakase Residency at Sushi Noz NYC"
    );
    assert.equal(
      humanizeScribeChange("New content found: Friday tap list", "ignored"),
      "New content found: Friday tap list"
    );
    assert.equal(
      humanizeScribeChange(null, "Weekend brunch hours"),
      "New content found: Weekend brunch hours"
    );
  });

  it("renders customer-facing HTML without internal wording or duplicate no-response copy", () => {
    const { html, text } = renderAutopilotApprovalEmail({
      brandName: "Sushi Noz",
      changeLine:
        "New content found: Sushi Saito Omakase Residency at Sushi Noz NYC",
      subject: "Saito residency this month",
      audienceLabel: "Everyone subscribed",
      recipients: 184,
      previewSnippet: "A short preview of the draft campaign.",
      approveUrl: "https://sendfable.com/autopilot/review?t=approve",
      editUrl: "https://sendfable.com/autopilot/review?t=edit",
      rejectUrl: "https://sendfable.com/autopilot/review?t=skip",
    });

    assert.match(html, />SendFable</);
    assert.doesNotMatch(html, /Sendfable/);
    assert.doesNotMatch(html, /substantial_new_content/);
    assert.doesNotMatch(html, /Detected a page change/i);
    assert.match(html, /New content found:/);
    assert.match(html, /Sushi Saito Omakase Residency at Sushi Noz NYC/);
    assert.match(html, /Subject:/);
    assert.match(html, /Saito residency this month/);
    assert.match(html, /Audience:/);
    assert.match(html, /Everyone subscribed/);
    assert.match(html, /Estimated recipients:<\/strong> 184/);
    assert.match(html, /Approve &amp; Schedule/);
    assert.match(html, />Edit</);
    assert.match(html, /Skip this campaign/);
    assert.match(html, /Nothing sends until you choose the date and time/);
    assert.equal((html.match(/If you do nothing/gi) || []).length, 0);
    assert.equal((html.match(/Nothing sends until you choose/g) || []).length, 1);
    assert.match(html, /width=device-width/);
    assert.match(html, /max-width:520px/);

    assert.match(text, /SendFable/);
    assert.doesNotMatch(text, /Sendfable/);
    assert.match(text, /New content found: Sushi Saito Omakase Residency at Sushi Noz NYC/);
    assert.match(text, /Approve & Schedule:/);
    assert.match(text, /Edit:/);
    assert.match(text, /Skip this campaign:/);
    assert.equal((text.match(/If you do nothing/gi) || []).length, 0);
    assert.equal((text.match(/Nothing sends until you choose/g) || []).length, 1);
  });

  it("uses SendFable as the platform From display name", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/autopilot/approval.ts"), "utf8");
    assert.match(src, /platformFrom\("SendFable"\)/);
    const mailer = readFileSync(join(process.cwd(), "src/lib/mailer.ts"), "utf8");
    assert.match(mailer, /displayName = "SendFable"/);
  });
});
