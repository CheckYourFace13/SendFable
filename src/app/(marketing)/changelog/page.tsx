import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { CHANGELOG } from "@/data/changelog";

export const metadata = {
  title: "Changelog",
  description:
    "Sendfable product changelog with dated entries for shipped features — authentication, sending, billing, and list protection.",
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Changelog", href: "/changelog", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Features that are available in the product today. We do not backdate vaporware. Follow{" "}
        <Link href="/feed.xml" className="font-medium text-teal hover:underline">
          /feed.xml
        </Link>{" "}
        for RSS.
      </p>

      <ol className="mt-12 space-y-10">
        {CHANGELOG.map((entry) => (
          <li key={`${entry.date}-${entry.title}`} className="border-l-2 border-teal/30 pl-6">
            <time className="text-sm font-medium text-ink" dateTime={entry.date}>
              {entry.date}
            </time>
            <h2 className="mt-1 text-xl font-semibold">{entry.title}</h2>
            <p className="mt-2 text-sm text-slate-700">{entry.body}</p>
            {entry.tags && entry.tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      <MarketingCta title="Try what already shipped" body="Start on the free plan and send your first campaign." />
    </div>
  );
}
