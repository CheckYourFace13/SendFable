export function HeroProductComposition() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none" aria-hidden="true">
      {/* Decorative page layers */}
      <div className="absolute -left-4 top-8 hidden h-40 w-28 -rotate-6 rounded-sm border-2 border-ink/15 bg-parchment sm:block" />
      <div className="absolute -right-2 top-16 hidden h-32 w-24 rotate-3 rounded-sm border-2 border-ink/10 bg-lavender sm:block" />

      {/* Traveling page */}
      <div className="motion-page-travel absolute -right-1 top-0 z-20 hidden w-16 sm:block md:w-20">
        <svg viewBox="0 0 80 100" className="drop-shadow-md" fill="none">
          <rect x="4" y="4" width="56" height="72" rx="3" fill="#FFFDF8" stroke="#17213B" strokeWidth="2" />
          <path d="M60 8c10 8 14 20 14 32s-4 24-14 32" fill="#F7F1E7" stroke="#17213B" strokeWidth="2" />
          <path d="M16 22h32M16 34h28M16 46h30M16 58h22" stroke="#1E8179" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="48" cy="18" r="5" fill="#F26A4F" />
        </svg>
      </div>

      {/* Audience mini panel */}
      <div className="absolute -left-2 bottom-24 z-20 w-36 rounded-lg border-2 border-ink/10 bg-page p-3 shadow-lg sm:-left-6 sm:w-40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">Audience</p>
        <p className="mt-1 font-display text-lg text-ink">248 readers</p>
        <div className="mt-2 flex -space-x-1.5">
          {["#F26A4F", "#1E8179", "#17213B", "#DCD8F9"].map((c) => (
            <span
              key={c}
              className="inline-block h-6 w-6 rounded-full border-2 border-page"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Analytics mini panel */}
      <div className="absolute -right-1 bottom-8 z-20 w-36 rounded-lg border-2 border-ink/10 bg-ink p-3 text-page shadow-lg sm:right-0 sm:w-40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-page/50">Opened</p>
        <p className="mt-0.5 font-display text-xl text-coral">42%</p>
        <div className="mt-2 flex items-end gap-1">
          {[40, 65, 45, 80, 55, 70].map((h, i) => (
            <span
              key={i}
              className="w-3 rounded-sm bg-teal/80"
              style={{ height: `${h * 0.28}px` }}
            />
          ))}
        </div>
      </div>

      {/* Email editor mock */}
      <div className="relative z-10 overflow-hidden rounded-xl border-2 border-ink/15 bg-page shadow-xl">
        <div className="flex items-center gap-2 border-b border-ink/10 bg-parchment px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-coral/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-teal/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/30" />
          <span className="ml-2 text-xs text-ink/50">Campaign editor</span>
        </div>
        <div className="grid grid-cols-[88px_1fr] sm:grid-cols-[100px_1fr]">
          <aside className="space-y-1.5 border-r border-ink/10 bg-parchment/60 p-2 text-[10px] text-ink/70">
            {["Heading", "Text", "Image", "Button"].map((b) => (
              <div key={b} className="rounded border border-ink/10 bg-page px-1.5 py-1.5">
                {b}
              </div>
            ))}
          </aside>
          <div className="space-y-2.5 bg-parchment/40 p-4 sm:p-5">
            <div className="rounded-lg border border-ink/10 bg-page p-4 shadow-sm">
              <p className="font-display text-base text-ink sm:text-lg">Hey {"{{first_name}}"},</p>
              <p className="mt-1.5 text-xs leading-relaxed text-charcoal/70 sm:text-sm">
                Something new is ready — a short story worth opening.
              </p>
              <div className="mt-3 inline-block rounded-md bg-coral px-3 py-1.5 text-xs font-medium text-page">
                Read the update
              </div>
            </div>
            <div className="h-1.5 w-2/3 rounded bg-ink/10" />
            <div className="h-1.5 w-1/2 rounded bg-ink/8" />
          </div>
        </div>
      </div>
    </div>
  );
}
