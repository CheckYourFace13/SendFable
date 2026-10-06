import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const OUT = join(process.cwd(), "docs", "screenshots", "marketing-autopilot");
const PUBLIC = join(process.cwd(), "public", "product");

async function shot(page: import("@playwright/test").Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(PUBLIC, { recursive: true });
  const pngPath = join(OUT, `${name}.png`);
  await page.screenshot({ path: pngPath, type: "png", fullPage: false });
  // Convert to WebP via sharp if available; else keep PNG and copy as fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharpMod = require("sharp");
    const sharp = (sharpMod.default || sharpMod) as (input: string) => {
      webp: (o: { quality: number }) => { toFile: (p: string) => Promise<unknown> };
    };
    const webpOut = join(OUT, `${name}.webp`);
    const webpPublic = join(PUBLIC, `autopilot-${name}.webp`);
    await sharp(pngPath).webp({ quality: 82 }).toFile(webpOut);
    await sharp(pngPath).webp({ quality: 82 }).toFile(webpPublic);
  } catch {
    execFileSync("node", [
      "-e",
      `require('fs').copyFileSync(${JSON.stringify(pngPath)}, ${JSON.stringify(join(PUBLIC, `autopilot-${name}.png`))})`,
    ]);
  }
}

test.describe("Marketing Autopilot certification surfaces", () => {
  test("feature page lifecycle copy", async ({ page }) => {
    await page.goto("/automated-email-marketing");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const label of ["Collect", "Watch", "Draft", "Approve", "Send"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText(/No approval\. No send/i).first()).toBeVisible();
    await expect(page.getByText(/No response/i).first()).toBeVisible();
  });

  test("homepage Autopilot sells the promise", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#marketing-autopilot");
    await expect(section).toBeVisible();
    await expect(section).toContainText(/YOUR WEBSITE CHANGES/i);
    await expect(section).toContainText(/YOU APPROVE IT/i);
    await expect(section).toContainText(/No approval\. No send/i);
    await expect(section.getByRole("link", { name: /Start free/i })).toBeVisible();
  });

  test("cert specials page is public and noindex-friendly", async ({ page }) => {
    const res = await page.goto("/cert/autopilot-specials");
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator("main")).toContainText(/Specials/i);
  });

  test("approval review GET does not imply send (missing token)", async ({ page }) => {
    await page.goto("/autopilot/review");
    await expect(page.getByRole("heading", { name: /Link missing/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Approve|send now/i })).toHaveCount(0);
  });

  test("capture product screenshots", async ({ page }) => {
    test.setTimeout(120_000);
    const views = [
      ["setup", "setup"],
      ["detected", "detected"],
      ["draft", "draft"],
      ["email", "approval-email"],
      ["confirm", "approval-confirm"],
      ["result", "campaign-result"],
    ] as const;

    for (const [view, name] of views) {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto(`/cert/autopilot-ui?view=${view}`);
      await expect(page.getByText(/Marketing Autopilot|Campaign|Fall Special|sent/i).first()).toBeVisible();
      await shot(page, name);
    }

    await page.goto("/");
    await page.locator("#marketing-autopilot").scrollIntoViewIfNeeded();
    await shot(page, "homepage-section");

    await page.goto("/automated-email-marketing");
    await shot(page, "feature-page");
  });
});

test.describe("Marketing Autopilot mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("homepage Autopilot readable on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#marketing-autopilot")).toBeVisible();
    await expect(page.locator("#marketing-autopilot")).toContainText(/Start free/i);
  });

  test("feature page mobile", async ({ page }) => {
    await page.goto("/automated-email-marketing");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
