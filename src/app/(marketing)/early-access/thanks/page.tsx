import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { publicSignupAllowed } from "@/lib/early-launch";

export const metadata = {
  title: "Start free",
  description: "Create your free SendFable account.",
};

export const dynamic = "force-dynamic";

export default function EarlyAccessThanksPage({
  searchParams,
}: {
  searchParams?: { dup?: string };
}) {
  if (publicSignupAllowed()) {
    redirect("/signup");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">SendFable</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
        {searchParams?.dup ? "You are already on the list" : "Thanks"}
      </h1>
      <p className="mt-4 text-ink/70">Public signup is available now.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
          <Link href="/signup">Start writing free</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
