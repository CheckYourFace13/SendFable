import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PUBLIC_PAGES = [
  "src/app/(marketing)/contact/page.tsx",
  "src/components/marketing/site-footer.tsx",
  "src/app/(app)/billing/page.tsx",
];

const LEGAL_KEEP = new Set([
  "refund-policy",
  "acceptable-use",
  "privacy",
  "terms",
  "cookies",
  "security",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("public contact method", () => {
  it("does not publish mailbox addresses on contact, footer, or billing", () => {
    for (const rel of PUBLIC_PAGES) {
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      assert.doesNotMatch(src, /mailto:/i, rel);
      assert.doesNotMatch(src, /support@sendfable\.com/i, rel);
      assert.doesNotMatch(src, /hello@sendfable\.com/i, rel);
      assert.doesNotMatch(src, /chris@/i, rel);
    }
  });

  it("keeps non-legal marketing routes free of published mailboxes", () => {
    const root = join(process.cwd(), "src/app/(marketing)");
    const hits: string[] = [];
    for (const file of walk(root)) {
      const rel = file.replace(/\\/g, "/");
      if ([...LEGAL_KEEP].some((slug) => rel.includes(`/${slug}/`))) continue;
      const src = readFileSync(file, "utf8");
      if (/mailto:/i.test(src) || /support@sendfable\.com/i.test(src) || /chris@[a-z0-9.-]+/i.test(src)) {
        hits.push(rel);
      }
    }
    assert.deepEqual(hits, []);
  });

  it("keeps contact-form security controls", () => {
    const support = readFileSync(join(process.cwd(), "src/app/api/support/route.ts"), "utf8");
    assert.match(support, /websiteTrap/);
    assert.match(support, /validateInquiryEmail/);
    assert.match(support, /rateLimit\("support"/);
    assert.match(support, /rateLimit\("support-dup"/);
    assert.match(support, /classifyInquirySpam/);
    assert.doesNotMatch(support, /recaptcha/i);
    assert.doesNotMatch(support, /hcaptcha/i);
  });
});
