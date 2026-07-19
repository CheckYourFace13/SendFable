const PRIMARY = [
  {
    title: "People",
    body: "Import contacts, tag them, and keep a clean list.",
  },
  {
    title: "Email",
    body: "Write with blocks or Simple Mode — your brand, your words.",
  },
  {
    title: "Send",
    body: "Check confidence, schedule or send, and we handle delivery.",
  },
  {
    title: "Results",
    body: "See opens, clicks, and a sensible next follow-up.",
  },
];

const ADVANCED = [
  "Segments",
  "Scheduled sends",
  "Domain authentication",
  "Follow-ups",
  "Signup forms",
  "Analytics",
];

export function Simplicity() {
  return (
    <section className="border-b border-ink/10 bg-page py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-display-md text-ink text-balance">
            Everything you need. Nothing buried.
          </h2>
          <p className="mt-3 text-charcoal/75">
            The everyday path stays front and center. Advanced tools are one click away — not a maze.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRIMARY.map((item, i) => (
            <li
              key={item.title}
              className="relative rounded-xl border-2 border-ink/10 bg-parchment p-5"
            >
              <span className="font-display text-sm text-coral">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-display text-xl text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/75">{item.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
            When you need more
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {ADVANCED.map((label) => (
              <li
                key={label}
                className="rounded-full border border-ink/15 bg-page px-3 py-1.5 text-sm text-ink/75"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
