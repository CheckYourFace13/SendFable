"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function UnsubscribePage() {
  const params = useParams<{ token: string }>();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Logo className="mb-8 text-2xl" />
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        {done ? (
          <>
            <h1 className="text-xl font-semibold">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You won&apos;t receive further emails from this list. Sorry to see you go.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Unsubscribe?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirm to stop receiving emails from this sender. You can always re-subscribe later
              via their signup form.
            </p>
            <Button className="mt-6 w-full" onClick={confirm} disabled={loading}>
              {loading ? "Unsubscribing…" : "Confirm unsubscribe"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
