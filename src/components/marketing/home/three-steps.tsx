const STEPS = [
  {
    n: "01",
    title: "Add your readers",
    body: "Import a CSV, paste a list, or publish a signup form. Tag people so the right story reaches the right inbox.",
    visual: "readers" as const,
  },
  {
    n: "02",
    title: "Write your email",
    body: "Start from a goal or a blank page. Drag blocks, drop in your brand colors, and preview on phone and desktop.",
    visual: "write" as const,
  },
  {
    n: "03",
    title: "Send your story",
    body: "Check Send Confidence, schedule or send now, and watch opens, clicks, and follow-up ideas roll in.",
    visual: "send" as const,
  },
];

function ReadersVisual() {
  return (
    <div className="paper-panel rounded-xl border-2 border-ink/10 p-5" aria-hidden="true">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink/50">Audience</span>
        <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-medium text-teal">
          + CSV import
        </span>
      </div>
      <ul className="space-y-2">
        {[
          { name: "Maya Chen", tag: "Newsletter" },
          { name: "Jordan Blake", tag: "Events" },
          { name: "Sam Rivera", tag: "VIP" },
        ].map((r) => (
          <li
            key={r.name}
            className="flex items-center justify-between rounded-lg border border-ink/8 bg-page px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lavender text-[10px] font-semibold text-ink">
                {r.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </span>
              <span className="text-sm text-ink">{r.name}</span>
            </div>
            <span className="rounded bg-parchment px-1.5 py-0.5 text-[10px] text-ink/60">
              {r.tag}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WriteVisual() {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-ink/10 bg-page shadow-lg" aria-hidden="true">
      <div className="border-b border-ink/10 bg-parchment px-3 py-2 text-xs text-ink/50">
        Subject: This weekend at the shop
      </div>
      <div className="grid grid-cols-[72px_1fr]">
        <aside className="space-y-1 border-r border-ink/10 p-2 text-[10px] text-ink/60">
          {["Logo", "Headline", "Photo", "Button"].map((b) => (
            <div key={b} className="rounded border border-ink/10 bg-parchment/80 px-1 py-1">
              {b}
            </div>
          ))}
        </aside>
        <div className="space-y-2 bg-parchment/30 p-4">
          <div className="h-2 w-16 rounded bg-coral/40" />
          <div className="font-display text-base text-ink">Weekend specials</div>
          <div className="h-16 rounded-md bg-teal/20" />
          <div className="h-2 w-full rounded bg-ink/10" />
          <div className="h-2 w-4/5 rounded bg-ink/10" />
          <div className="inline-block rounded bg-coral-solid px-3 py-1 text-[10px] font-semibold text-white">
            See the menu
          </div>
        </div>
      </div>
    </div>
  );
}

function SendVisual() {
  return (
    <div className="paper-panel rounded-xl border-2 border-ink/10 p-5" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
            Send Confidence
          </p>
          <p className="mt-1 font-display text-3xl text-teal">92</p>
          <p className="text-xs text-ink/55">Ready to send</p>
        </div>
        <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
          <circle cx="32" cy="32" r="28" stroke="#F7F1E7" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="#1E8179"
            strokeWidth="6"
            strokeDasharray="162"
            strokeDashoffset="14"
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </svg>
      </div>
      <ul className="mt-4 space-y-1.5 text-xs text-ink/70">
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Sender verified
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Unsubscribe link present
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" /> One link looks thin — optional fix
        </li>
      </ul>
    </div>
  );
}

function StepVisual({ kind }: { kind: (typeof STEPS)[number]["visual"] }) {
  if (kind === "readers") return <ReadersVisual />;
  if (kind === "write") return <WriteVisual />;
  return <SendVisual />;
}

export function ThreeSteps() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-ink/10 bg-page py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral">
            How it works
          </p>
          <h2 className="mt-3 font-display text-display-md text-ink text-balance">
            Add your readers. Write your email. Send your story.
          </h2>
          <p className="mt-3 text-charcoal/75">
            Three clear steps — no marketing-ops maze between you and your first send.
          </p>
        </div>

        <ol className="mt-14 space-y-16">
          {STEPS.map((step, i) => {
            const reverse = i % 2 === 1;
            return (
              <li
                key={step.n}
                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                  reverse ? "" : ""
                }`}
              >
                <div className={reverse ? "lg:order-2" : ""}>
                  <span className="font-display text-sm text-coral">{step.n}</span>
                  <h3 className="mt-2 font-display text-2xl text-ink sm:text-3xl">{step.title}</h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-charcoal/75">
                    {step.body}
                  </p>
                </div>
                <div className={reverse ? "lg:order-1" : ""}>
                  <StepVisual kind={step.visual} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
