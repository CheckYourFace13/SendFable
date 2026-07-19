import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Early access",
  description: "Sendfable is in early launch. Public signup is temporarily closed.",
  robots: { index: true, follow: true },
};

export default function EarlyAccessPage() {
  return (
    <div className="editorial-bg mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
        Early launch
      </p>
      <h1 className="mt-3 font-display text-display-md text-ink">
        We&apos;re still writing the first chapter.
      </h1>
      <p className="mt-4 text-lg text-charcoal/75">
        Public signup is closed while we finish delivery and billing setup. The marketing site stays
        open — if you already have an account, you can log in.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-coral text-page hover:bg-coral-hover">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to homepage</Link>
        </Button>
      </div>
      <p className="mt-8 text-sm text-ink/60">
        Want early access? Email{" "}
        <a className="font-medium text-coral underline" href="mailto:chris@sendfable.com">
          chris@sendfable.com
        </a>
        .
      </p>
    </div>
  );
}
