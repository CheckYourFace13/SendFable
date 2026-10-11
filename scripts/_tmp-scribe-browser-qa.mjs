import { chromium } from "@playwright/test";
import { readFileSync, unlinkSync } from "fs";

const base = "https://sendfable.com";
const password = readFileSync(process.env.SF_QA_PW_FILE, "utf8").trim();
const email = "chris@iscreamstudio.com";
const qaId = "cms0kvs9k00033gne6uxqvnu2";
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function overflow() {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    const mainOverflow = main ? main.scrollWidth > main.clientWidth + 1 : false;
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      mainScroll: main ? main.scrollWidth : 0,
      mainClient: main ? main.clientWidth : 0,
      overflow: docOverflow || mainOverflow,
    };
  });
}

try {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  record("login", !page.url().includes("/login"), page.url());

  await page.getByRole("link", { name: "Scribe" }).first().click();
  await page.waitForURL(/\/scribe/);
  record("left-nav", page.url().includes("/scribe"));

  const nav = page.getByRole("navigation", { name: "Scribe sections" });
  await nav.waitFor();
  for (const section of ["Overview", "Source", "Cadence", "Drafts", "Brand", "Usage"]) {
    await nav.getByRole("link", { name: section }).click();
    await page.waitForTimeout(400);
    const id = section.toLowerCase();
    const heading =
      section === "Overview"
        ? page.getByRole("heading", { level: 1, name: "Scribe" })
        : section === "Source"
          ? page.getByRole("heading", { name: "What should Scribe watch?" })
          : section === "Cadence"
            ? page.getByRole("heading", { name: "How often should Scribe look?" })
            : section === "Drafts"
              ? page.getByRole("heading", { name: "Waiting for you" })
              : section === "Brand"
                ? page.getByRole("heading", { name: "Make it look like you" })
                : page.getByRole("heading", { name: "Plan & usage" });
    const box = await heading.boundingBox();
    const hash = new URL(page.url()).hash;
    const inView = !!box && box.y >= 0 && box.y < 900;
    record(`jump-${id}`, hash === `#${id}` && inView, `hash=${hash} y=${box && Math.round(box.y)}`);
  }

  const sticky = await page.evaluate(() => {
    const main = document.querySelector("main");
    const nav = document.querySelector('nav[aria-label="Scribe sections"]');
    if (!main || !nav) return { error: "missing" };
    main.scrollTop = 900;
    const style = getComputedStyle(nav);
    const pad = Math.round(parseFloat(getComputedStyle(main).paddingTop) || 0);
    const navRect = nav.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    const expected = Math.round(mainRect.top + pad);
    return {
      position: style.position,
      navTop: Math.round(navRect.top),
      mainTop: Math.round(mainRect.top),
      pad,
      delta: Math.round(navRect.top - expected),
      scrollTop: main.scrollTop,
    };
  });
  record(
    "sticky-nav",
    sticky.position === "sticky" && Math.abs(sticky.delta) <= 4 && sticky.scrollTop > 100 && sticky.navTop > 0,
    JSON.stringify(sticky)
  );

  await page.goto(`${base}/admin/internal`);
  await page.getByRole("button", { name: "View as" }).first().click();
  await page.waitForTimeout(1000);
  await page.goto(`${base}/scribe`);
  await page.getByText(/Admin viewing/i).waitFor({ timeout: 15000 });
  record("admin-banner", true);
  const adminHeading = page.getByRole("heading", { level: 1, name: "Scribe" });
  await adminHeading.waitFor({ timeout: 15000 }).catch(() => {});
  record("admin-scribe-heading", await adminHeading.isVisible());
  await page.getByRole("button", { name: "Exit Admin View" }).click();
  await page.waitForTimeout(800);

  const switched = await page.evaluate(async (workspaceId) => {
    const res = await fetch("/api/workspace/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, error: body.error || "" };
  }, qaId);
  record("switch-qa-workspace", switched.ok, JSON.stringify(switched));
  await page.goto(`${base}/scribe`);
  await page.getByRole("heading", { name: "How often should Scribe look?" }).scrollIntoViewIfNeeded();
  record("weekly-selectable", await page.getByRole("button", { name: /Use this|Selected/ }).first().isVisible());
  record("locked-daily", await page.getByText("Available on Starter").isVisible());
  record("locked-twice", await page.getByText("Available on Growth").isVisible());
  await page.getByRole("link", { name: "Upgrade" }).first().click();
  await page.waitForURL(/\/billing/);
  record("upgrade-link", page.url().includes("/billing"), page.url());
  await page.goto(`${base}/scribe#usage`);
  await page.getByRole("heading", { name: "Plan & usage" }).waitFor();
  const usageText = await page.locator("#usage").innerText();
  record("usage-counter", /Scribe creations included/.test(usageText) && /Free|0/.test(usageText), usageText.slice(0, 180).replace(/\s+/g, " "));
  record("buy-creations", /Buy /.test(usageText), usageText.includes("Buy") ? "present" : "missing");

  await page.getByRole("heading", { name: "Waiting for you" }).scrollIntoViewIfNeeded();
  record("test-draft-visible", await page.getByText("Scribe QA — do not send").isVisible());
  await page.getByRole("button", { name: "Approve & Schedule" }).click();
  const schedule = page.getByRole("button", { name: "SCHEDULE CAMPAIGN" });
  await schedule.waitFor();
  record("schedule-ui", await schedule.isVisible());
  record("empty-schedule-blocked", await schedule.isDisabled());
  await page.locator('input[type="date"]').fill("2026-11-02");
  await page.locator('input[type="time"]').fill("09:30");
  const tz = page.locator("select").first();
  record("timezone-empty-before", (await tz.inputValue()) === "");
  await tz.selectOption({ index: 1 });
  record("timezone-selected", (await tz.inputValue()).length > 0);
  record("schedule-not-submitted", !(await page.getByText(/Scheduled for/i).isVisible()));

  await page.locator("#drafts").getByRole("button", { name: "Edit" }).click();
  await page.waitForURL(/\/campaigns\/scribeqacamp20261011/, { timeout: 15000 });
  record(
    "edit-opens-campaign",
    page.url().includes("/campaigns/scribeqacamp20261011"),
    page.url()
  );
  await page.goto(`${base}/scribe#drafts`);
  await page.getByRole("heading", { name: "Waiting for you" }).waitFor();
  await page.locator("#drafts").getByRole("button", { name: "Skip" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Skip" }).click();
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#drafts");
      if (!root) return false;
      const heads = [...root.querySelectorAll("h2, h3")];
      const waiting = heads.find((el) => (el.textContent || "").includes("Waiting"));
      const recent = heads.find((el) => (el.textContent || "").includes("Recent"));
      let text = "";
      for (let node = waiting && waiting.nextSibling; node && node !== recent; node = node.nextSibling) {
        text += node.textContent || "";
      }
      return text.includes("No drafts are waiting");
    },
    undefined,
    { timeout: 10000 }
  );
  record("skip", true);

  for (const size of [
    { width: 360, height: 800 },
    { width: 375, height: 812 },
    { width: 393, height: 852 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(`${base}/scribe`);
    await page.getByRole("navigation", { name: "Scribe sections" }).waitFor();
    const metrics = await overflow();
    const navBox = await page.getByRole("navigation", { name: "Scribe sections" }).boundingBox();
    record(
      `mobile-${size.width}`,
      !metrics.overflow && !!navBox && navBox.width <= size.width + 2,
      JSON.stringify({ ...metrics, navWidth: navBox && Math.round(navBox.width) })
    );
  }
} catch (err) {
  record("exception", false, err instanceof Error ? err.message : String(err));
  await page.screenshot({ path: "scripts/_tmp-scribe-qa-fail.png", fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  try {
    unlinkSync(process.env.SF_QA_PW_FILE);
  } catch {
    /* already gone */
  }
}

const failed = results.filter((item) => !item.ok);
console.log(`SUMMARY ${results.length - failed.length}/${results.length}`);
if (failed.length) process.exit(1);
