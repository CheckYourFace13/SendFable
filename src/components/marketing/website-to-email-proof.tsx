/**
 * Controlled example: a fictional cafe page becomes a campaign the owner approves.
 * Not a real business, and not a live send control.
 */

function LatteArt() {
  return (
    <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden>
      <rect width="160" height="120" fill="#3f2a22" />
      <ellipse cx="80" cy="96" rx="36" ry="8" fill="#2a1b16" />
      <path d="M48 42h52c2 22-6 40-26 46-20-6-28-24-26-46z" fill="#f4e7d4" />
      <path d="M100 50h14c8 0 12 6 10 14s-8 12-16 10" fill="none" stroke="#f4e7d4" strokeWidth="6" />
      <ellipse cx="74" cy="48" rx="22" ry="8" fill="#e8d3b4" />
      <path d="M66 46c6 4 10 4 16 0" fill="none" stroke="#c47a3a" strokeWidth="2" />
      <circle cx="28" cy="28" r="10" fill="#e4572e" opacity="0.9" />
    </svg>
  );
}

const STEPS = ["Their website", "SendFable creates the email", "Owner approves", "Send"];

export function WebsiteToEmailProof() {
  return (
    <figure className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-6">
      <figcaption className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-teal">
        Example · Harbor &amp; Rye is a fictional cafe
      </figcaption>
      <ol className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-semibold text-ink/70">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden className="text-ink/30">
                →
              </span>
            )}
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-ink/10 bg-[#f6f1e8]">
          <div className="flex items-center gap-2 border-b border-ink/10 bg-white px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-ink/20" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-ink/20" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-ink/20" aria-hidden />
            <p className="truncate text-[11px] text-ink/50">harborandrye.example/specials</p>
          </div>
          <div className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
              Harbor &amp; Rye
            </p>
            <div className="mt-3 overflow-hidden rounded-lg">
              <div className="aspect-[16/9] max-h-36">
                <LatteArt />
              </div>
            </div>
            <h3 className="mt-3 font-display text-xl text-ink">Weekend Special</h3>
            <p className="mt-1 text-sm text-ink/70">October 10–12 · Pumpkin latte · $4.95</p>
            <p className="mt-2 text-sm text-ink/60">
              In the cafe this weekend. Dine in or take it to go.
            </p>
            <p className="mt-3 inline-block rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-white">
              See the special
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-ink/10 bg-parchment/40">
          <div className="border-b border-ink/10 bg-white px-3 py-2 text-[11px] text-ink/55">
            <span className="font-semibold text-ink">Subject:</span> Weekend Special is here
          </div>
          <div className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/45">
              Example SendFable campaign
            </p>
            <div className="mt-3 overflow-hidden rounded-lg">
              <div className="aspect-[16/9] max-h-36">
                <LatteArt />
              </div>
            </div>
            <h3 className="mt-3 font-display text-xl text-ink">Weekend Special</h3>
            <p className="mt-1 text-sm font-medium text-ink">October 10–12 · $4.95</p>
            <p className="mt-2 text-sm text-ink/65">
              Harbor &amp; Rye&apos;s pumpkin latte is on for the weekend.
            </p>
            <p className="mt-3 inline-block rounded-md bg-coral-solid px-3 py-1.5 text-xs font-semibold text-white">
              See the special
            </p>
          </div>
        </div>
      </div>

      <div
        className="mt-4 rounded-xl border border-ink/10 bg-page px-4 py-3"
        role="group"
        aria-label="Example approval choices. These are not live send controls."
      >
        <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-ink/45">
          You choose
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-md bg-teal px-3 py-2 text-sm font-semibold text-white">
            Approve &amp; send
          </span>
          <span className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink">
            Edit
          </span>
          <span className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink">
            Don&apos;t send
          </span>
        </div>
        <p className="mt-3 text-center text-sm font-bold uppercase tracking-wider text-coral">
          No approval. No send.
        </p>
      </div>
    </figure>
  );
}
