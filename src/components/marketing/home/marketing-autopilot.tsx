import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  { n: "1", title: "Collect", body: "Customer joins your list." },
  { n: "2", title: "Watch", body: "SendFable watches your marketing page." },
  { n: "3", title: "Draft", body: "A ready-to-send campaign is created." },
  { n: "4", title: "Approve", body: "You approve, edit, or skip it." },
  { n: "5", title: "Send", body: "Nothing goes out until you say so." },
];

const SHOTS = [
  {
    webp: "/product/autopilot-detected.webp",
    alt: "Website change detected: New Fall Special",
    label: "1 · Detected",
  },
  {
    webp: "/product/autopilot-draft.webp",
    alt: "Generated campaign draft ready to review",
    label: "2 · Drafted",
  },
  {
    webp: "/product/autopilot-approval-confirm.webp",
    alt: "Owner confirmation page before send",
    label: "3 · You approve",
  },
];

export function MarketingAutopilotHome() {
  return (
    <section
      id="marketing-autopilot"
      className="relative overflow-hidden border-b border-ink/10 bg-gradient-to-b from-parchment via-page to-teal/5 py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden>
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-coral blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-teal blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Marketing Autopilot
          </p>
          <h2 className="mt-3 font-display text-display-md text-ink text-balance sm:text-display-lg">
            Your website changes.
            <br />
            SendFable turns it into a campaign.
            <br />
            You approve it.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-charcoal/75 sm:text-lg">
            Collect customers with SendFable forms, point SendFable at the page where you post
            specials, events, products or news, and get a ready-to-send campaign when something
            worth sharing changes.
          </p>
          <p className="mt-4 text-sm font-bold uppercase tracking-wider text-coral">
            No approval. No send.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
          {SHOTS.map((s) => (
            <figure
              key={s.label}
              className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm"
            >
              <div className="border-b border-ink/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                {s.label}
              </div>
              <picture>
                <source srcSet={s.webp} type="image/webp" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/product/autopilot-flow.svg"
                  alt={s.alt}
                  width={640}
                  height={420}
                  className="h-auto w-full object-cover object-top"
                />
              </picture>
            </figure>
          ))}
        </div>

        <ol className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-5">
          {STEPS.map((s) => (
            <li key={s.n} className="text-center sm:text-left">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-page">
                {s.n}
              </span>
              <p className="mt-2 font-semibold text-ink">{s.title}</p>
              <p className="mt-1 text-sm text-ink/60">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-coral-solid text-white hover:bg-coral-hover">
            <Link href="/signup">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-ink/15">
            <Link href="/automated-email-marketing">See Marketing Autopilot</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
