/**
 * Soft CI guard against common AI marketing copy patterns.
 * Counts em dashes in marketing UI copy; fails only if over budget.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src", "components", "marketing");
const EM_DASH = /\u2014/g;
const BANNED = [/everything you need/i, /marketing-ops maze/i, /\bmaze\b/i];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

describe("marketing copy scrub", () => {
  it("keeps em-dash count under budget in marketing components", () => {
    const files = walk(ROOT);
    let total = 0;
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      total += (text.match(EM_DASH) || []).length;
    }
    assert.ok(
      total < 120,
      `Expected <120 em dashes in marketing components, found ${total}`
    );
  });

  it("avoids banned AI phrases on homepage sections", () => {
    const files = [
      join(ROOT, "home", "simplicity.tsx"),
      join(ROOT, "home", "three-steps.tsx"),
      join(ROOT, "home", "hero.tsx"),
    ];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const re of BANNED) {
        assert.equal(re.test(text), false, `${f} matched ${re}`);
      }
    }
  });
});
