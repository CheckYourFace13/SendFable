/**
 * Print IndexNow candidate URLs for new growth pages (owner/admin submits).
 * Does not call IndexNow itself (requires server env + rate limits).
 */
const PATHS = [
  "/constant-contact-alternative",
  "/mailerlite-alternative",
  "/email-newsletter-software",
  "/email-marketing-cost",
  "/small-business-newsletter-software",
  "/guides/how-often-to-email-customers",
  "/guides/build-email-list-without-buying",
  "/guides/spf-dkim-dmarc-explained",
  "/guides/can-spam-checklist-for-small-businesses",
];

console.log("Submit via POST /api/admin/indexnow as platform owner:");
console.log(JSON.stringify({ urls: PATHS.map((p) => `https://sendfable.com${p}`) }, null, 2));
