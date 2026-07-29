import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Public marketing surfaces must not advertise early-access / coming-soon
 * once the product is generally available.
 */
const FORBIDDEN = [
  /coming soon/i,
  /being written now/i,
  /request early access/i,
  /join early access/i,
  /join the waitlist/i,
  /join the early-access/i,
];

const ROOTS = [
  join(process.cwd(), "src", "app", "(marketing)"),
  join(process.cwd(), "src", "components", "marketing"),
  join(process.cwd(), "src", "app", "(auth)"),
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) out.push(p);
  }
  return out;
}

describe("public launch wording", () => {
  it("forbids stale early-access / coming-soon copy in public UI source", () => {
    const files = ROOTS.flatMap((r) => walk(r));
    const hits: string[] = [];
    for (const file of files) {
      // Legacy waitlist form may remain for admin/history but must not be linked from live CTAs.
      if (file.replace(/\\/g, "/").includes("/early-access-form.")) continue;
      if (file.replace(/\\/g, "/").includes("/early-access/")) continue;
      const text = readFileSync(file, "utf8");
      for (const re of FORBIDDEN) {
        if (re.test(text)) hits.push(`${file}: ${re}`);
      }
    }
    assert.equal(hits.length, 0, hits.join("\n"));
  });

  it("announcement bar points to signup, not waitlist", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "components", "marketing", "home", "announcement-bar.tsx"),
      "utf8"
    );
    assert.match(src, /href="\/signup"/);
    assert.doesNotMatch(src, /early-access/);
    assert.doesNotMatch(src, /waitlist/i);
  });
});
