import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { publicSignupAllowed } from "@/lib/early-launch";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Start free",
  description: `Create your free SendFable account — ${PLANS.FREE.contactCap} contacts, no credit card required.`,
};

export const dynamic = "force-dynamic";

/** Legacy waitlist URL — public signup is open, so send people to /signup. */
export default function EarlyAccessPage() {
  if (publicSignupAllowed()) {
    redirect("/signup");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">SendFable</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink">
        Create your free account
      </h1>
      <p className="mt-4 text-ink/70">
        Public signup is open. Start with {PLANS.FREE.contactCap.toLocaleString()} contacts and send
        your first campaign — no credit card required.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
          <Link href="/signup">Start writing free</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/pricing">View pricing</Link>
        </Button>
      </div>
    </div>
  );
}
