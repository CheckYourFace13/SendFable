import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Free email marketing tools",
  description:
    "Free tools for better email marketing. Check a subject line, spot risky copy, and compare what email software costs. No account required.",
  path: "/tools",
});

const TOOLS = [
  {
    href: "/tools/email-pricing-calculator",
    title: "Email pricing calculator",
    body: "Estimate a monthly cost by list size, using dated public prices. Uncertain vendor prices are not turned into a savings claim.",
    cta: "Compare costs",
  },
  {
    href: "/tools/subject-line-tester",
    title: "Subject line tester",
    body: "Length, shouting, vague wording, and extra punctuation. A checklist score — not a guess at open rates.",
    cta: "Check a subject",
  },
  {
    href: "/tools/spam-word-checker",
    title: "Spam word checker",
    body: "Paste a subject and body. See pressure phrases and formatting issues, with a clear limit on what a word can prove.",
    cta: "Check the copy",
  },
  {
    href: "/tools/send-time-planner",
    title: "Send time planner",
    body: "A few reasonable windows for your audience and timezone. A place to start testing — not a guaranteed best time.",
    cta: "Plan a window",
  },
] as const;

export default function ToolsHubPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Tools", href: "/tools", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Free tools for better email marketing
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Check a subject line. Spot risky copy. Compare what email software costs. No account
        required.
      </p>
      <ul className="mt-10 space-y-4">
        {TOOLS.map((tool) => (
          <li key={tool.href} className="rounded-2xl border border-ink/10 bg-white p-6">
            <h2 className="text-xl font-semibold text-ink">{tool.title}</h2>
            <p className="mt-2 text-sm text-ink/70">{tool.body}</p>
            <p className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href={tool.href} className="font-semibold text-coral hover:underline">
                {tool.cta}
              </Link>
              <Link href="/signup" className="font-semibold text-ink hover:underline">
                Start free
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
