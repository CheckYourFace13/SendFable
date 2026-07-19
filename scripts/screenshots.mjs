import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "docs", "screenshots");
mkdirSync(outDir, { recursive: true });

const pages = [
  { path: "/", name: "home" },
  { path: "/pricing", name: "pricing" },
  { path: "/compare/mailchimp", name: "compare-mailchimp" },
  { path: "/solutions/restaurants", name: "solutions-restaurants" },
  { path: "/migrate", name: "migrate" },
  { path: "/templates", name: "templates" },
  { path: "/login", name: "login" },
];

async function shoot(browser, viewport, suffix) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  for (const p of pages) {
    await page.goto(`http://localhost:3000${p.path}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    const file = join(outDir, `${p.name}-${suffix}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log("wrote", file);
  }
  await context.close();
}

const browser = await chromium.launch();
await shoot(browser, { width: 1440, height: 900 }, "desktop");
await shoot(browser, { width: 390, height: 844 }, "mobile");
await browser.close();
console.log("done");
