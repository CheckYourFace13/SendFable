import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const GUIDES = ["wordpress", "wix", "webflow", "squarespace"] as const;

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("signup install guides use the live embed script and a placeholder slug", () => {
  const guide = read("src/components/marketing/signup-install-guide.tsx");
  assert.match(guide, /https:\/\/sendfable\.com\/embed\/form\.js/);
  assert.doesNotMatch(guide, /\/embed\.js/);
  assert.match(guide, /data-sendfable-form="your-form"/);
  assert.match(guide, /data-display="popup"/);
  assert.doesNotMatch(guide, /drinkknird|krisers/i);

  for (const slug of GUIDES) {
    const page = read(`src/app/(marketing)/integrations/${slug}/page.tsx`);
    assert.match(page, new RegExp(`path: "/integrations/${slug}"`));
    assert.match(page, /Signup Tools/);
    assert.match(page, /Inline/);
    assert.match(page, /Popup/);
    assert.doesNotMatch(page, /\/embed\.js/);
  }
});

test("install guides are public, in the sitemap, and linked from integrations", () => {
  const sitemap = read("src/app/sitemap.ts");
  const middleware = read("src/middleware.ts");
  const robots = read("src/app/robots.ts");
  const hub = read("src/app/(marketing)/integrations/page.tsx");
  assert.match(middleware, /"\/integrations\/"/);
  assert.match(robots, /"\/integrations\/"/);
  for (const slug of GUIDES) {
    const route = `/integrations/${slug}`;
    assert.match(sitemap, new RegExp(`"${route}"`));
    assert.match(hub, new RegExp(`href="${route}"`));
  }
  assert.match(hub, /https:\/\/sendfable\.com\/embed\/form\.js/);
  assert.doesNotMatch(hub, /\/embed\.js/);
});
