const TEMPLATES = [
  {
    id: "brewery",
    name: "Brewery release",
    subject: "Drop day is Friday",
    hero: "bg-teal",
    cta: "See pickup times",
  },
  {
    id: "restaurant",
    name: "Restaurant weekly",
    subject: "Specials on the board",
    hero: "bg-coral",
    cta: "View the menu",
  },
  {
    id: "listing",
    name: "New listing",
    subject: "Just listed · Maple St",
    hero: "bg-ink",
    cta: "Tour details",
  },
  {
    id: "opening",
    name: "Grand opening",
    subject: "We’re open this Saturday",
    hero: "bg-lavender",
    cta: "Get directions",
  },
  {
    id: "fundraiser",
    name: "Fundraiser",
    subject: "Help us reach the goal",
    hero: "bg-parchment",
    cta: "Donate",
  },
  {
    id: "newsletter",
    name: "Newsletter",
    subject: "Your monthly update",
    hero: "bg-teal/30",
    cta: "Read more",
  },
  {
    id: "winback",
    name: "Win-back",
    subject: "We saved you a seat",
    hero: "bg-coral/30",
    cta: "Come back",
  },
  {
    id: "event",
    name: "Event announcement",
    subject: "You’re invited Saturday",
    hero: "bg-ink/80",
    cta: "RSVP",
  },
];

export function TemplateGallery() {
  return (
    <section className="border-b border-ink/10 bg-lavender/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-display-md text-ink text-balance">
            Templates that look like finished emails
          </h2>
          <p className="mt-3 text-charcoal/75">
            Scroll the gallery — CSS previews of common small-business sends. Start from any of them
            after signup.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <ul
          className="flex gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
          aria-label="Email template previews"
        >
          {TEMPLATES.map((t) => (
            <li key={t.id} className="w-[220px] shrink-0 sm:w-[240px]">
              <article className="overflow-hidden rounded-xl border-2 border-ink/10 bg-page shadow-md page-lift">
                <div className="border-b border-ink/8 px-3 py-2">
                  <p className="truncate text-[11px] text-ink/50">{t.subject}</p>
                </div>
                <div className="space-y-2.5 p-3" aria-hidden="true">
                  <div className={`h-20 rounded-md ${t.hero}`} />
                  <p className="font-display text-sm text-ink">{t.name}</p>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded bg-ink/10" />
                    <div className="h-1.5 w-4/5 rounded bg-ink/10" />
                    <div className="h-1.5 w-3/5 rounded bg-ink/10" />
                  </div>
                  <div className="inline-block rounded bg-coral px-2.5 py-1 text-[10px] font-medium text-page">
                    {t.cta}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
