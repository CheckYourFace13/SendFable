import { Suspense } from "react";
import { marketingPageMeta } from "@/components/marketing/json-ld";
import { TrySignupBuilder } from "@/components/marketing/try-signup-builder";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "See it working",
  description: `Try a SendFable signup on a sample website. Free to start (${PLANS.FREE.contactCap} contacts). No account required to try.`,
  path: "/try/signup-tool",
});

export default function TrySignupToolPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16">Loading…</div>}>
      <TrySignupBuilder />
    </Suspense>
  );
}
