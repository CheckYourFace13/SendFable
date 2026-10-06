import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    n: "1",
    title: "Collect",
    body: "Customer joins your list.",
  },
  {
    n: "2",
    title: "Watch",
    body: "SendFable watches your marketing page.",
  },
  {
    n: "3",
    title: "Draft",
    body: "A ready-to-send campaign is created.",
  },
  {
    n: "4",
    title: "Approve",
    body: "You approve, edit, or skip it.",
  },
  {
    n: "5",
    title: "Send",
    body: "Nothing goes out until you say so.",
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
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-charcoal/75 sm:text-lg">
            Point SendFable at the page where you post specials, events, products, or news. When
            something worth sharing changes, SendFable drafts the campaign and sends it to you for
            approval.
          </p>
        </div>

        {/* Visual story */}
        <div className="mx-auto mt-12 max-w-4xl">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
            <VisualCard
              label="Website page"
              body="New Fall Special — $12 lunch plate, all week"
            />
            <Arrow />
            <VisualCard
              label="Email draft"
              body="Subject: New Fall Special this week"
              accent
            />
            <Arrow />
            <VisualCard
              label="You approve"
              body="Approve & send · Edit · Don't send"
              approve
            />
          </div>
          <p className="mt-4 text-center text-sm font-medium text-ink/70">
            New Fall Special detected → campaign ready → customers only after you approve
          </p>
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
            <Link href="/automated-email-marketing">See how Marketing Autopilot works</Link>
          </Button>
        </div>

        <p className="mt-6 text-center text-xs font-semibold uppercase tracking-wider text-ink/45">
          No approval. No send.
        </p>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <div
      className="hidden items-center justify-center text-2xl text-ink/30 sm:flex"
      aria-hidden
    >
      →
    </div>
  );
}

function VisualCard({
  label,
  body,
  accent,
  approve,
}: {
  label: string;
  body: string;
  accent?: boolean;
  approve?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        accent
          ? "border-coral/30 bg-white"
          : approve
            ? "border-emerald-200 bg-emerald-50/50"
            : "border-ink/10 bg-white/90"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-2 text-sm font-medium text-ink">{body}</p>
      {approve && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            Approve & send
          </span>
          <span className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            Edit
          </span>
          <span className="rounded bg-slate-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Don&apos;t send
          </span>
        </div>
      )}
    </div>
  );
}
