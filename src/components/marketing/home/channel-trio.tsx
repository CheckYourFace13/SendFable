import Link from "next/link";
import { isSmsPublicEnabled } from "@/lib/sms/flags";

const CHANNELS = [
  {
    id: "email",
    label: "Email",
    blurb: "Newsletters, offers, and updates with Send Confidence before you hit send.",
    accent: "border-teal/40 bg-teal/5",
    labelClass: "text-teal",
  },
  {
    id: "text",
    label: "Text",
    blurb: "Short messages with STOP/HELP built in when Text Messaging is live on your account.",
    accent: "border-sky/40 bg-sky/5",
    labelClass: "text-sky",
  },
  {
    id: "both",
    label: "Both",
    blurb: "One audience, one campaign: email and text together without juggling tools.",
    accent: "border-ink/15 bg-gradient-to-br from-teal/10 to-sky/10",
    labelClass: "text-ink",
  },
] as const;

/** Shown only when public SMS is enabled. Keeps Email-only customers free of SMS noise. */
export function ChannelTrio() {
  if (!isSmsPublicEnabled()) return null;

  return (
    <section className="section-mist border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <h2 className="font-display text-display-md text-ink text-balance">
          Pick Email, Text, or Both
        </h2>
        <p className="mt-3 max-w-2xl text-charcoal/75">
          Same contacts. Same campaign flow. Choose the channel that fits the message.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {CHANNELS.map((c) => (
            <div key={c.id} className={`rounded-xl border p-5 ${c.accent}`}>
              <p className={`text-sm font-semibold uppercase tracking-wide ${c.labelClass}`}>
                {c.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{c.blurb}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm">
          <Link href="/pricing" className="font-medium text-coral motion-underline">
            See email and text pricing
          </Link>
        </p>
      </div>
    </section>
  );
}
