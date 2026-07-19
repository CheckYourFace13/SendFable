import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "You're on the list",
  robots: { index: false, follow: false },
};

export default function EarlyAccessThanksPage({
  searchParams,
}: {
  searchParams: { dup?: string };
}) {
  const dup = searchParams.dup === "1";
  return (
    <div className="editorial-bg mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Early access</p>
      <h1 className="mt-3 font-display text-display-md text-ink">
        {dup ? "You're already on the list." : "Thanks — you're on the list."}
      </h1>
      <p className="mt-4 text-lg text-charcoal/75">
        {dup
          ? "We already have this email. No need to submit again."
          : "We'll reach out when a spot opens. No account was created yet."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to homepage</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </div>
  );
}
