import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { SubjectLineTester } from "@/components/marketing/subject-line-tester";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Subject line tester",
  description:
    "Check an email subject for length, vague wording, extra punctuation, and shouting. A checklist score, not an open-rate prediction. No account required.",
  path: "/tools/subject-line-tester",
});

export default function SubjectLineTesterPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Tools", href: "/tools" },
          { label: "Subject line tester", href: "/tools/subject-line-tester", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Subject line tester</h1>
      <p className="mt-4 text-lg text-ink/75">
        See whether the line is readable, specific, and calm. It will not tell you an open rate.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/tools/spam-word-checker" className="font-medium text-coral hover:underline">
          Check the body too
        </Link>
      </p>
      <div className="mt-8">
        <SubjectLineTester />
      </div>
      <MarketingCta
        title="Want help writing the whole campaign?"
        body="Start free with SendFable. Write the email, preview it, and send when you are ready."
        primaryLabel="Turn the subject into a full campaign"
        secondaryHref="/tools"
        secondaryLabel="All tools"
      />
    </div>
  );
}
