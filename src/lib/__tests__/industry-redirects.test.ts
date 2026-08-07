/**
 * Industry SEO redirects: overlapping /email-marketing-for-* → /solutions/*.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());

describe("industry SEO redirects", () => {
  it("defines permanent redirects for overlapping industry URLs", () => {
    const src = readFileSync(join(ROOT, "next.config.mjs"), "utf8");
    const pairs: Array<[string, string]> = [
      ["/email-marketing-for-breweries", "/solutions/breweries"],
      ["/email-marketing-for-restaurants", "/solutions/restaurants"],
      ["/email-marketing-for-nonprofits", "/solutions/nonprofits"],
      ["/email-marketing-for-retail", "/solutions/retail"],
      ["/email-marketing-for-real-estate", "/solutions/real-estate"],
      ["/email-marketing-for-events", "/solutions/local-events"],
      ["/email-marketing-for-local-business", "/solutions/professional-services"],
    ];
    for (const [from, to] of pairs) {
      assert.match(src, new RegExp(`source:\\s*"${from.replace(/\//g, "\\/")}"`));
      assert.match(src, new RegExp(`destination:\\s*"${to.replace(/\//g, "\\/")}"`));
      assert.match(src, /permanent:\s*true/);
    }
  });

  it("keeps duplicate industry pages out of the sitemap", () => {
    const sitemap = readFileSync(join(ROOT, "src/app/sitemap.ts"), "utf8");
    for (const path of [
      "/email-marketing-for-breweries",
      "/email-marketing-for-restaurants",
      "/email-marketing-for-nonprofits",
    ]) {
      assert.doesNotMatch(sitemap, new RegExp(`"${path}"`));
    }
    assert.match(sitemap, /\/solutions\/breweries/);
    assert.match(sitemap, /\/email-marketing-for-small-business/);
  });
});
