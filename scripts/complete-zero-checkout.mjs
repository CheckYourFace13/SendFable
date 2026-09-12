/**
 * Complete a live $0 Stripe Checkout session (ToS + subscribe).
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const url = process.env.CHECKOUT_URL;
if (!url) {
  console.error("CHECKOUT_URL required");
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(120_000);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("text=/Subscribe|Total due|\\$0/i", { timeout: 60_000 });
  await page.waitForTimeout(1500);

  const bodyText = await page.locator("body").innerText();
  console.log(
    JSON.stringify({
      hasZero: /\$0\.00/.test(bodyText),
      hasPromo: /SFCERT0|100%\s*off/i.test(bodyText),
      snippet: bodyText.slice(0, 400).replace(/\s+/g, " "),
    })
  );

  // Check every visible checkbox (ToS)
  const boxes = page.locator('input[type="checkbox"]');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const box = boxes.nth(i);
    if (await box.isVisible().catch(() => false)) {
      await box.check({ force: true }).catch(async () => {
        await box.click({ force: true });
      });
    }
  }
  // Also try role checkboxes
  const roleBoxes = page.getByRole("checkbox");
  const rn = await roleBoxes.count();
  for (let i = 0; i < rn; i++) {
    const box = roleBoxes.nth(i);
    if (await box.isVisible().catch(() => false)) {
      const checked = await box.isChecked().catch(() => false);
      if (!checked) await box.click({ force: true }).catch(() => {});
    }
  }

  await page.waitForTimeout(500);

  // Prefer the primary subscribe CTA
  const candidates = [
    page.getByTestId("hosted-payment-submit-button"),
    page.locator('button[type="submit"]'),
    page.getByRole("button", { name: /^Subscribe$/i }),
    page.getByRole("button", { name: /Subscribe/i }),
    page.getByRole("button", { name: /Start|Pay|Complete|Confirm/i }),
  ];

  let clicked = false;
  for (const c of candidates) {
    if ((await c.count()) > 0 && (await c.first().isVisible().catch(() => false))) {
      await c.first().click({ force: true });
      clicked = true;
      console.log(JSON.stringify({ clicked: true }));
      break;
    }
  }
  if (!clicked) {
    fs.writeFileSync("scripts/_checkout-fail.html", await page.content());
    await page.screenshot({ path: "scripts/_checkout-fail.png", fullPage: true });
    console.error("No submit button found");
    await browser.close();
    process.exit(3);
  }

  // Wait for either success redirect or error
  const result = await Promise.race([
    page.waitForURL(/sendfable\.com\/billing/i, { timeout: 120_000 }).then(() => "redirect"),
    page
      .waitForSelector("text=/Something went wrong|error|card number|payment method/i", {
        timeout: 120_000,
      })
      .then(() => "error_ui")
      .catch(() => null),
    page.waitForTimeout(115_000).then(() => "timeout"),
  ]);

  const finalUrl = page.url();
  const finalText = await page.locator("body").innerText().catch(() => "");
  console.log(
    JSON.stringify({
      result,
      finalUrl,
      looksSuccess: /billing\?success=1|success=1/i.test(finalUrl),
      snippet: finalText.slice(0, 300).replace(/\s+/g, " "),
    })
  );

  if (!/sendfable\.com\/billing/i.test(finalUrl)) {
    await page.screenshot({ path: "scripts/_checkout-fail.png", fullPage: true });
    fs.writeFileSync("scripts/_checkout-fail.html", await page.content());
    await browser.close();
    process.exit(2);
  }

  await browser.close();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
