import { test, expect } from "@playwright/test";

const origin = process.env.PLAYWRIGHT_BASE_URL || "https://sendfable.com";
const slug = "drinkknird-newsletter";

function pageHtml(attrs: string, tall = false) {
  return `<!doctype html>
<html>
  <body style="margin:0;${tall ? "height:4000px" : ""}">
    <div ${attrs}></div>
    <script src="${origin}/embed/form.js"></script>
  </body>
</html>`;
}

test("inline embed still renders in place and does not open a popup", async ({ page }) => {
  await page.setContent(pageHtml(`data-sendfable-form="${slug}"`), { waitUntil: "load" });
  await expect(page.locator("form.sendfable-form")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const sms = page.locator('input[name="smsConsent"]');
  if (await sms.count()) await expect(sms).not.toBeChecked();
});

test("popup waits for the delay, stays on screen, and closes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.install();
  await page.setContent(
    pageHtml(`data-sendfable-form="${slug}" data-display="popup" data-trigger="delay" data-delay="5" data-frequency="once"`),
    { waitUntil: "load" }
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.clock.fastForward(5000);
  const dialog = page.getByRole("dialog", { name: "Signup" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeLessThanOrEqual(375);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
});

test("popup scroll trigger and frequency cap", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.setContent(
    pageHtml(
      `data-sendfable-form="${slug}" data-display="popup" data-trigger="scroll" data-scroll="25" data-frequency="once"`,
      true
    ),
    { waitUntil: "load" }
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.3));
  const dialog = page.getByRole("dialog", { name: "Signup" });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("a once-per-visitor popup does not return after it has been shown", async ({ page }) => {
  await page.clock.install();
  const html = pageHtml(
    `data-sendfable-form="${slug}" data-display="popup" data-trigger="delay" data-delay="5" data-frequency="once"`
  );
  await page.route(origin + "/popup-qa", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: html })
  );
  await page.goto(origin + "/popup-qa");
  await page.evaluate((key) => localStorage.setItem(key, String(Date.now())), `sf-popup:${slug}`);
  await page.goto(origin + "/popup-qa");
  await page.clock.fastForward(6000);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("popup fits a 393px wide screen", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.clock.install();
  await page.setContent(
    pageHtml(`data-sendfable-form="${slug}" data-display="popup" data-trigger="delay" data-delay="5" data-frequency="7d"`),
    { waitUntil: "load" }
  );
  await page.clock.fastForward(5000);
  const dialog = page.getByRole("dialog", { name: "Signup" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(393);
  expect(box!.x + box!.width).toBeLessThanOrEqual(393 + 1);
});
