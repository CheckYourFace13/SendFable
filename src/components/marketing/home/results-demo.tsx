export function ResultsDemo() {
  return (
    <section className="border-b border-ink/10 bg-page py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
              Campaign results
            </p>
            <h2 className="mt-3 font-display text-display-md text-ink text-balance">
              See what your campaign can tell you.
            </h2>
            <p className="mt-3 text-charcoal/75">
              Illustrative product data — not real customer statistics.
            </p>
          </div>
          <span className="rounded-full border border-coral/40 bg-coral/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral-solid">
            Demo data
          </span>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Delivered" value="1,842" note="of 1,900 attempted" />
          <Stat label="Clicked" value="312" note="unique clickers" />
          <div className="rounded-xl border-2 border-ink/10 bg-parchment p-5 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
              Most popular link
            </p>
            <p className="mt-2 font-display text-lg text-ink">/weekend-menu</p>
            <p className="mt-1 text-sm text-ink/60">148 clicks · demo</p>
          </div>
          <Stat label="New unsubscribes" value="6" note="auto-suppressed" />
          <div className="rounded-xl border-2 border-ink/10 bg-ink p-5 text-page">
            <p className="text-xs font-semibold uppercase tracking-wider text-page/50">
              Audience health
            </p>
            <p className="mt-2 font-display text-2xl text-coral">Steady</p>
            <p className="mt-1 text-sm text-page/65">
              Bounce and complaint rates within normal demo thresholds.
            </p>
          </div>
          <div className="rounded-xl border-2 border-teal/30 bg-teal/10 p-5 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal">
              Suggested follow-up
            </p>
            <p className="mt-2 font-display text-lg text-ink">
              Write to people who clicked but didn’t visit again.
            </p>
            <p className="mt-2 text-sm text-ink/65">Demo suggestion from campaign analytics.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border-2 border-ink/10 bg-page p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink/60">{note}</p>
    </div>
  );
}
