/**
 * Free plan public copy must match PLANS.FREE (no stale 2,000 emails claims).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PLANS, freePlanPromise } from "../plans";
import { SENDFABLE_FACTS } from "../../data/sendfable-facts";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "docs") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

describe("free plan source of truth", () => {
  it("keeps Free at 500 contacts / 1,000 emails", () => {
    assert.equal(PLANS.FREE.contactCap, 500);
    assert.equal(PLANS.FREE.emailsPerMonth, 1_000);
    assert.equal(PLANS.STARTER.monthlyPrice, 12);
  });

  it("derives freePlanPromise from PLANS", () => {
    assert.match(freePlanPromise(), /500/);
    assert.match(freePlanPromise(), /1,000/);
  });

  it("keeps SENDFABLE_FACTS Free FAQ aligned", () => {
    const faq = SENDFABLE_FACTS.faqs.find((f) => /free/i.test(f.q));
    assert.ok(faq);
    assert.match(faq!.a, /500/);
    assert.match(faq!.a, /1,000/);
    assert.doesNotMatch(faq!.a, /2,000/);
  });

  it("forbids stale Free-plan 2,000 emails claims in src UI", () => {
    const files = walk(join(process.cwd(), "src"));
    const offenders: string[] = [];
    const bad =
      /free[^\n]{0,80}2,?000\s*emails|2,?000\s*emails[^\n]{0,40}free|up to 2,?000 emails\/month/i;
    for (const file of files) {
      if (file.includes(`${join("src", "data", "competitors")}`)) continue;
      if (file.includes("__tests__")) continue;
      const src = readFileSync(file, "utf8");
      if (bad.test(src)) offenders.push(file);
    }
    assert.deepEqual(offenders, []);
  });
});
