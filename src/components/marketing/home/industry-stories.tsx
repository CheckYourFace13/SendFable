import Link from "next/link";

const INDUSTRIES = [
  {
    name: "Restaurant",
    href: "/solutions/restaurants",
    campaign: "Weekly specials & hours",
    subject: "What’s on the board this week",
    panel: "bg-coral-solid text-white",
    preview: "bg-page text-ink",
    accent: "bg-ink",
  },
  {
    name: "Brewery",
    href: "/solutions/breweries",
    campaign: "Can release alert",
    subject: "Drop day — pickup windows inside",
    panel: "bg-teal text-page",
    preview: "bg-parchment text-ink",
    accent: "bg-coral",
  },
  {
    name: "Real estate",
    href: "/solutions/real-estate",
    campaign: "New listing spotlight",
    subject: "Just listed on Maple Street",
    panel: "bg-ink text-page",
    preview: "bg-lavender text-ink",
    accent: "bg-coral",
  },
  {
    name: "Retail",
    href: "/solutions/retail",
    campaign: "Weekend sale",
    subject: "Members shop early Saturday",
    panel: "bg-lavender text-ink",
    preview: "bg-page text-ink",
    accent: "bg-teal",
  },
  {
    name: "Nonprofit",
    href: "/solutions/nonprofits",
    campaign: "Fundraiser update",
    subject: "We’re 70% to the goal — help us close",
    panel: "bg-parchment text-ink",
    preview: "bg-page text-ink border border-ink/10",
    accent: "bg-coral",
  },
  {
    name: "Local services",
    href: "/solutions/professional-services",
    campaign: "Seasonal reminder",
    subject: "Time for your spring checkup",
    panel: "bg-page text-ink border-2 border-ink/10",
    preview: "bg-parchment text-ink",
    accent: "bg-ink",
  },
];

export function IndustryStories() {
  return (
    <section className="border-b border-ink/10 bg-parchment py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display-md text-ink text-balance">
            Stories that fit your kind of business
          </h2>
          <p className="mt-3 text-charcoal/75">
            Example campaigns and subjects — starting points, not invented customer results.
          </p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind) => (
            <li key={ind.name}>
              <Link
                href={ind.href}
                className={`group flex h-full flex-col rounded-xl p-5 page-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral ${ind.panel}`}
              >
                <h3 className="font-display text-2xl">{ind.name}</h3>
                <p className="mt-1 text-sm opacity-80">{ind.campaign}</p>
                <div className={`mt-5 flex-1 rounded-lg p-4 ${ind.preview}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50">
                    Subject
                  </p>
                  <p className="mt-1 text-sm font-medium leading-snug">{ind.subject}</p>
                  <div className={`mt-4 h-1.5 w-14 rounded ${ind.accent}`} />
                  <div className="mt-3 space-y-1.5 opacity-40">
                    <div className="h-1.5 w-full rounded bg-current" />
                    <div className="h-1.5 w-4/5 rounded bg-current" />
                    <div className="h-1.5 w-2/3 rounded bg-current" />
                  </div>
                </div>
                <span className="mt-4 text-sm font-medium motion-underline">
                  Explore {ind.name.toLowerCase()} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
