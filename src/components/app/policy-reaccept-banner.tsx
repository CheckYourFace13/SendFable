"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CURRENT_POLICY_BUNDLE } from "@/lib/legal-policies";

export function PolicyReacceptBanner() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return null;

  async function accept() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/policy-acceptance", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not record acceptance");
      setDone(true);
      toast.success("Thanks — policies accepted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record acceptance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Please review and accept our updated policies (bundle {CURRENT_POLICY_BUNDLE}):{" "}
          <Link className="underline" href="/terms">
            Terms
          </Link>
          ,{" "}
          <Link className="underline" href="/privacy">
            Privacy
          </Link>
          ,{" "}
          <Link className="underline" href="/acceptable-use">
            Acceptable Use
          </Link>
          , and{" "}
          <Link className="underline" href="/refund-policy">
            Billing &amp; Refunds
          </Link>
          . Access is not blocked for missing historical records — this confirms the current
          versions.
        </p>
        <Button
          type="button"
          size="sm"
          className="shrink-0 bg-coral-solid text-white hover:bg-coral-hover"
          loading={loading}
          onClick={() => void accept()}
        >
          I agree
        </Button>
      </div>
    </div>
  );
}
