import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Features",
  description:
    "SendFable features: any-email signup, sender identities, CSV audiences, drag-and-drop builder, campaigns, and analytics.",
  path: "/features",
});

const SECTIONS = [
  {
    id: "campaigns",
    title: "Email campaigns",
    body: "Write, schedule, and send with pause and resume, merge tags, and one-click unsubscribe built in.",
  },
  {
    id: "audience",
    title: "Audience",
    body: "CSV import with mapping, tags, visual segments, hosted signup forms, and double opt-in.",
  },
  {
    id: "builder",
    title: "Email builder",
    body: "Blocks for heading, text, image, button, columns, social, and a mandatory compliant footer.",
  },
  {
    id: "forms",
    title: "Forms",
    body: "Hosted signup forms that grow a consented list without leaving your brand.",
  },
  {
    id: "analytics",
    title: "Analytics",
    body: "Opens, clicks, bounces, complaints, link performance, and account health thresholds.",
  },
  {
    id: "deliverability",
    title: "Deliverability",
    body: "Reliable delivery with smart From-rewrite for Gmail and Yahoo-style sender domains.",
  },
  {
    id: "signup",
    title: "Any-email signup",
    body: "Password or magic link. No Google or Microsoft account required — ever.",
  },
  {
    id: "senders",
    title: "Sender identities",
    body: "Verify any From address. Strict providers get a friendly From-rewrite so mail lands.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Features</h1>
      <p className="mt-3 text-lg text-ink/65">
        Everything you need to grow a list and send campaigns that feel personal.
      </p>
      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <div key={s.id} id={s.id} className="scroll-mt-28">
            <h2 className="text-lg font-semibold text-ink">{s.title}</h2>
            <p className="mt-2 text-sm text-ink/60">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
