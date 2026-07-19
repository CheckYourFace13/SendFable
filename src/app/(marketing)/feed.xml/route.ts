import { CHANGELOG } from "@/data/changelog";
import { appUrl } from "@/lib/utils";

export const runtime = "nodejs";

const RESOURCES = [
  {
    title: "Email marketing guide",
    description:
      "A practical guide to lists, authentication, campaigns, and measuring what matters.",
    path: "/email-marketing-guide",
    date: "2026-07-18",
  },
  {
    title: "Deliverability explained",
    description: "SPF, DKIM, DMARC, From-rewrite, and list-quality protections.",
    path: "/deliverability",
    date: "2026-07-18",
  },
  {
    title: "Migrate to Sendfable",
    description: "CSV-first migration paths from common ESPs.",
    path: "/migrate",
    date: "2026-07-18",
  },
  {
    title: "Resources hub",
    description: "Guides and references for running email without hype.",
    path: "/resources",
    date: "2026-07-18",
  },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const items = [
    ...CHANGELOG.map((entry) => ({
      title: `Changelog: ${entry.title}`,
      description: entry.body,
      path: "/changelog",
      date: entry.date,
      guid: `changelog-${entry.date}-${entry.title}`,
    })),
    ...RESOURCES.map((r) => ({
      title: r.title,
      description: r.description,
      path: r.path,
      date: r.date,
      guid: `resource-${r.path}`,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sendfable — Changelog &amp; resources</title>
    <link>${escapeXml(appUrl("/"))}</link>
    <description>Product changelog entries and key marketing resources from Sendfable.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(appUrl(item.path))}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${new Date(item.date + "T12:00:00Z").toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
