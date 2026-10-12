import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { SpamWordChecker } from "@/components/marketing/spam-word-checker";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Spam word checker",
  description:
    "Paste a subject and email body to spot pressure phrases, shouting, and crowded links. A word is not an automatic spam verdict. No account required.",
  path: "/tools/spam-word-checker",
});

export default function SpamWordCheckerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Tools", href: "/tools" },
          { label: "Spam word checker", href: "/tools/spam-word-checker", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Spam word checker</h1>
      <p className="mt-4 text-lg text-ink/75">
        Look for risky phrasing and messy formatting. Modern filtering uses more than a word list.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/deliverability" className="font-medium text-coral hover:underline">
          Deliverability checklist
        </Link>
      </p>
      <div className="mt-8">
        <SpamWordChecker />
      </div>
      <MarketingCta
        title="Build and send with SendFable."
        body="Start free with SendFable. Authentication, a real unsubscribe, and a list of people who asked."
        primaryLabel="Start free with SendFable"
        secondaryHref="/tools/subject-line-tester"
        secondaryLabel="Subject line tester"
      />
    </div>
  );
}
