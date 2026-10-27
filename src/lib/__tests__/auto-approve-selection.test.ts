import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("acquisition auto-approve selection", () => {
  const src = readFileSync(join(process.cwd(), "src/lib/acquisition/auto-approve.ts"), "utf8");

  it("loads QUALIFIED prospects before leftover DISCOVERED rows", () => {
    const qualifiedAt = src.indexOf('status: "QUALIFIED"');
    const discoveredAt = src.indexOf('status: "DISCOVERED"');
    assert.ok(qualifiedAt > 0);
    assert.ok(discoveredAt > qualifiedAt);
    assert.match(src, /QUALIFIED first/);
    assert.match(src, /const rows = \[\.\.\.qualified, \.\.\.discovered\]/);
  });

  it("retries demo drafts without consuming the daily room on failure", () => {
    assert.match(src, /MAX_DEMO_ATTEMPTS = 6/);
    assert.match(src, /demoRoom--/);
    const decrement = src.indexOf("demoRoom--");
    const success = src.indexOf("if (demo.ok)");
    assert.ok(success > 0 && decrement > success);
    assert.match(src, /reasons\[`demo_\$\{demo\.reason/);
  });
});
