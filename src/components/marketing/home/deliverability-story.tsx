const STEPS = [
  {
    title: "Verify your sender",
    body: "Confirm the From address you send as so readers recognize you.",
  },
  {
    title: "Authenticate your domain",
    body: "On Growth and Pro, add DNS records so inboxes can trust your domain.",
  },
  {
    title: "Sendfable handles delivery",
    body: "We send through our Amazon SES infrastructure — you don’t bring SMTP keys.",
  },
  {
    title: "Bounces and complaints stay clean",
    body: "Hard bounces and complaints are suppressed automatically so future sends stay healthier.",
  },
  {
    title: "Replies go to you",
    body: "Reply-To points at your real address so conversations land in your inbox.",
  },
  {
    title: "Send Confidence catches issues",
    body: "Before you launch, we flag missing unsubscribes, weak links, and common footguns.",
  },
];

export function DeliverabilityStory() {
  return (
    <section className="border-b border-ink/10 bg-page py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
              Deliverability
            </p>
            <h2 className="mt-3 font-display text-display-md text-ink text-balance">
              From your address to their inbox — explained plainly.
            </h2>
            <p className="mt-3 text-charcoal/75">
              We don’t promise a magic inbox rate. We do the practical work: identity, delivery,
              suppression, and pre-send checks.
            </p>
            <div className="mt-8" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/illustrations/letter-journey.svg"
                alt=""
                width={240}
                height={100}
                className="h-auto w-full max-w-sm"
              />
            </div>
          </div>

          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-xl border border-ink/10 bg-parchment/60 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm text-page">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-lg text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-charcoal/75">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
