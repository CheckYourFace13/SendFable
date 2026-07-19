import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "docs", "screenshots", "brand-redesign");
mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
];

const browser = await chromium.launch();

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await context.newPage();

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({
    path: join(outDir, `home-top-${vp.name}.png`),
    fullPage: false,
  });
  await page.screenshot({
    path: join(outDir, `home-full-${vp.name}.png`),
    fullPage: true,
  });

  if (vp.width <= 768) {
    const menuBtn = page.getByRole("button", { name: /menu|open navigation/i });
    if (await menuBtn.count()) {
      await menuBtn.first().click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: join(outDir, `mobile-nav-${vp.name}.png`),
        fullPage: false,
      });
      await page.keyboard.press("Escape");
    }
  }

  await page.goto("http://localhost:3000/#builder-showcase", {
    waitUntil: "networkidle",
    timeout: 60000,
  }).catch(() => {});
  await page.evaluate(() => {
    document.getElementById("builder-showcase")?.scrollIntoView();
  }).catch(() => {});
  await page.waitForTimeout(200);
  await page.screenshot({
    path: join(outDir, `product-demo-${vp.name}.png`),
    fullPage: false,
  });

  await page.goto("http://localhost:3000/pricing", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.screenshot({
    path: join(outDir, `pricing-${vp.name}.png`),
    fullPage: false,
  });

  await page.goto("http://localhost:3000/templates", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.screenshot({
    path: join(outDir, `templates-${vp.name}.png`),
    fullPage: false,
  });

  await page.goto("http://localhost:3000/login", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.screenshot({
    path: join(outDir, `login-${vp.name}.png`),
    fullPage: false,
  });

  await context.close();
  console.log("viewport", vp.name);
}

// Authenticated dashboard (demo seed) — one desktop capture
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"], input[type="email"]', "demo@sendfable.com");
  await page.fill('input[name="password"], input[type="password"]', "password123");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL(/dashboard|onboarding/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(outDir, "dashboard-1440x900.png"),
    fullPage: false,
  });
  await context.close();
  console.log("dashboard capture");
}

await browser.close();
console.log("done", outDir);
