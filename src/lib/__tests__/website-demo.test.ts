import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  candidateUrls,
  fetchCandidatePages,
  isBlockedDiscoveryUrl,
  MAX_DEMO_PAGES,
} from "@/lib/acquisition/website-demo/discover";
import {
  campaignSubjectFromHeadline,
  extractMarketingFacts,
} from "@/lib/acquisition/website-demo/extract";
import { buildWebsiteDemoEmail, DEMO_NEVER_SENDS_TO_CUSTOMER_LIST } from "@/lib/acquisition/website-demo/email";
import { PREVIEW_LABEL } from "@/lib/acquisition/website-demo/preview";
import { compareAcquisitionTracks, emptyTrackCounts } from "@/lib/acquisition/website-demo/metrics";
import { buildWebsiteDemo } from "@/lib/acquisition/website-demo/build";
import { assertSafePublicUrl } from "@/lib/ssrf";

const PAGE = `<!DOCTYPE html><html><body>
<header><img src="/logo.png" alt="logo" width="40" height="40"></header>
<main>
  <h1>North Shore Coffee</h1>
  <h2>Pumpkin Latte Weekend</h2>
  <p>Join us October 10-12 for our pumpkin latte. $4.95 while it lasts.</p>
  <img src="https://northshore.example/pumpkin.jpg" alt="Pumpkin latte" width="800" height="600">
  <img src="https://facebook.com/tr.png" alt="pixel" width="1" height="1">
  <img src="https://northshore.example/spacer.gif" alt="spacer" width="1" height="1">
  <a href="https://northshore.example/order">Order now</a>
</main>
<footer><a href="/privacy">Privacy</a></footer>
</body></html>`;

const THIN = `<html><body><main><h1>About our company</h1><p>We have been here for years and love the community.</p></main></body></html>`;

describe("website demo discovery", () => {
  it("blocks private, credentialed, and legal URLs", () => {
    assert.equal(isBlockedDiscoveryUrl("http://127.0.0.1/specials"), true);
    assert.equal(isBlockedDiscoveryUrl("https://user:pass@shop.example/menu"), true);
    assert.equal(isBlockedDiscoveryUrl("https://shop.example/privacy"), true);
    assert.equal(isBlockedDiscoveryUrl("https://shop.example/events"), false);
    assert.equal(isBlockedDiscoveryUrl("javascript:alert(1)"), true);
  });

  it("limits discovery and prefers marketing links over privacy", async () => {
    const home = `<a href="/privacy">Privacy</a><a href="/events">Events</a><a href="https://ads.example/sale">Ad</a>`;
    const urls = candidateUrls("https://shop.example/", home);
    assert.ok(urls.length <= MAX_DEMO_PAGES);
    assert.ok(urls.some((u) => u.includes("/events")));
    assert.equal(urls.some((u) => u.includes("privacy")), false);
    assert.equal(urls.some((u) => u.includes("ads.example")), false);

    const fetched: string[] = [];
    const pages = await fetchCandidatePages("https://shop.example/", async (url) => {
      fetched.push(url);
      if (fetched.length > MAX_DEMO_PAGES) throw new Error("too many fetches");
      return { url, body: url.endsWith("/events") ? PAGE : home };
    });
    assert.ok(fetched.length <= MAX_DEMO_PAGES);
    assert.ok(pages.length <= MAX_DEMO_PAGES);
  });

  it("refuses a private homepage before any fetch", async () => {
    let called = false;
    const pages = await fetchCandidatePages("http://127.0.0.1/admin", async () => {
      called = true;
      return { url: "http://127.0.0.1/admin", body: PAGE };
    });
    assert.equal(called, false);
    assert.equal(pages.length, 0);
  });
});

describe("website demo extraction", () => {
  it("keeps only facts and the same-site image that are on the page", () => {
    const facts = extractMarketingFacts(PAGE, "https://northshore.example/events", "North Shore Coffee");
    assert.ok(facts);
    assert.equal(facts?.headline, "Pumpkin Latte Weekend");
    assert.equal(facts?.dateText, "October 10-12");
    assert.equal(facts?.priceText, "$4.95");
    assert.equal(facts?.imageUrl, "https://northshore.example/pumpkin.jpg");
    assert.equal(facts?.ctaLabel, "Order now");
    assert.equal(campaignSubjectFromHeadline(facts!.headline), "Pumpkin Latte Weekend is here");
    assert.match(facts?.description || "", /pumpkin latte/);
  });

  it("does not mix a price from a different section into the chosen event", () => {
    const html = `<main>
      <h2>Tickets on Sale Now</h2>
      <p>Home About Contact Events Menu</p>
      <p>Lobby rental from $20.</p>
      <h2>PopUpPlay Halloween Party at Cherry Street Pier</h2>
      <p>Get ready for some not-so-spooky fun at Cherry Street Pier on Oct. 31 from 11 am to 1 pm!</p>
    </main>`;
    const facts = extractMarketingFacts(html, "https://pier.example/events", "Cherry Street Pier");
    assert.equal(facts?.headline, "PopUpPlay Halloween Party at Cherry Street Pier");
    assert.equal(facts?.dateText, "Oct. 31");
    assert.equal(facts?.priceText, null);
    assert.match(facts?.description || "", /not-so-spooky fun/);
  });

  it("rejects a navigation dump with no real offer", () => {
    const html = `<main><h2>Upcoming Events</h2><p>Tosca Figaro Season Packages Past Seasons Events Education About People Board Jobs History</p></main>`;
    assert.equal(extractMarketingFacts(html, "https://opera.example/", "Opera"), null);
  });

  it("does not invent a price or a demo when the page has no offer", () => {
    const facts = extractMarketingFacts(THIN, "https://shop.example/about", "Shop");
    assert.equal(facts, null);
    const priced = extractMarketingFacts(PAGE, "https://northshore.example/events", "North Shore Coffee");
    assert.equal(priced?.priceText === "$9.00", false);
  });

  it("falls back to normal outreach when no marketing page qualifies", async () => {
    const demo = await buildWebsiteDemo({
      website: "https://shop.example/",
      businessName: "Shop",
      fetchPage: async (url) => ({ url, body: THIN }),
    });
    assert.equal(demo, null);
  });
});

describe("website demo preview email", () => {
  it("renders a labeled preview and never a customer send", () => {
    const facts = extractMarketingFacts(PAGE, "https://northshore.example/events", "North Shore Coffee");
    assert.ok(facts);
    const mail = buildWebsiteDemoEmail({
      businessName: "North Shore Coffee",
      firstName: "Ava",
      facts: facts!,
      unsubUrl: "https://sendfable.com/unsubscribe",
      ctaUrl: "https://sendfable.com/automated-email-marketing",
    });
    assert.equal(DEMO_NEVER_SENDS_TO_CUSTOMER_LIST, true);
    assert.equal(mail.subject, "We made this from North Shore Coffee's website");
    assert.equal(mail.campaignSubject, "Pumpkin Latte Weekend is here");
    assert.match(mail.html, new RegExp(PREVIEW_LABEL));
    assert.match(mail.html, /Pumpkin Latte Weekend/);
    assert.match(mail.html, /\$4\.95/);
    assert.match(mail.html, /October 10-12/);
    assert.match(mail.html, /northshore\.example\/pumpkin\.jpg/);
    assert.match(mail.html, /Source: your public page/);
    assert.match(mail.html, /no thanks/);
    assert.match(mail.html, /unsubscribe/);
    assert.match(mail.text, /Nothing sends until you approve it/);
    assert.doesNotMatch(mail.html, /we monitor your website/i);
    assert.doesNotMatch(mail.html, /customers have been sent/i);
    assert.doesNotMatch(mail.html, /\$9\.00/);
    assert.doesNotMatch(mail.html, /facebook\.com/);
  });

  it("does not leak another business into the preview", () => {
    const facts = extractMarketingFacts(PAGE, "https://northshore.example/events", "North Shore Coffee");
    const mail = buildWebsiteDemoEmail({
      businessName: "North Shore Coffee",
      facts: facts!,
      unsubUrl: "https://sendfable.com/unsubscribe",
      ctaUrl: "https://sendfable.com/automated-email-marketing",
    });
    assert.doesNotMatch(mail.html, /Harbor Donuts/);
    assert.match(mail.html, /North Shore Coffee/);
  });
});

describe("website demo tracking", () => {
  it("compares click, signup, and paid rates separately from normal Casey", () => {
    const normal = emptyTrackCounts();
    normal.delivered = 20;
    normal.clicked = 4;
    normal.signup = 2;
    const demo = emptyTrackCounts();
    demo.delivered = 10;
    demo.clicked = 5;
    demo.signup = 3;
    demo.paid = 1;
    const rates = compareAcquisitionTracks(normal, demo);
    assert.equal(rates.normalClickRate, 0.2);
    assert.equal(rates.personalizedDemoClickRate, 0.5);
    assert.equal(rates.normalSignupRate, 0.1);
    assert.equal(rates.personalizedDemoSignupRate, 0.3);
    assert.equal(rates.personalizedDemoPaidConversion, 0.1);
  });
});

describe("public fetch guard", () => {
  it("rejects a private URL before DNS use is required to succeed", async () => {
    await assert.rejects(() => assertSafePublicUrl("http://127.0.0.1/specials"), /private|not allowed|Invalid/i);
    await assert.rejects(() => assertSafePublicUrl("https://user:pass@example.com/"), /credential/i);
  });
});
