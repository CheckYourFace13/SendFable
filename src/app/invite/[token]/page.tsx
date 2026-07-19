"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Joined workspace");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Logo className="mb-8 text-2xl" />
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Workspace invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with the invited email, then accept to join the workspace.
        </p>
        <Button className="mt-6 w-full" onClick={() => void accept()} disabled={loading}>
          {loading ? "Accepting…" : "Accept invitation"}
        </Button>
      </div>
    </div>
  );
}
