import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { SendTimePlanner } from "@/components/marketing/send-time-planner";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Send time planner",
  description:
    "Pick a few reasonable email send windows for your audience and timezone. A starting point to test — not a guaranteed best time. No account required.",
  path: "/tools/send-time-planner",
});

export default function SendTimePlannerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Tools", href: "/tools" },
          { label: "Send time planner", href: "/tools/send-time-planner", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Send time planner</h1>
      <p className="mt-4 text-lg text-ink/75">
        Get two windows worth testing. Your list’s opens and clicks matter more than a general rule.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/tools" className="font-medium text-coral hover:underline">
          All free tools
        </Link>
      </p>
      <div className="mt-8">
        <SendTimePlanner />
      </div>
    </div>
  );
}
