"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CAMPAIGN_GOALS } from "@/lib/campaign-goals";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function NewCampaignClient() {
  const router = useRouter();
  const search = useSearchParams();
  const presetGoal = search.get("goal");
  const [goal, setGoal] = useState(presetGoal || "");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (presetGoal && CAMPAIGN_GOALS.some((g) => g.id === presetGoal)) {
      void create(presetGoal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetGoal]);

  async function create(selectedGoal: string) {
    setCreating(true);
    const g = CAMPAIGN_GOALS.find((x) => x.id === selectedGoal);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: g ? g.label : "Untitled campaign",
          goal: selectedGoal || "scratch",
          simpleMode: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      if (g) {
        await fetch(`/api/campaigns/${data.campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: g.id,
            simpleMode: true,
            subject: g.subjectTips[0] || "",
            previewText: "Open for a quick update from us",
          }),
        });
      }

      router.replace(`/campaigns/${data.campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setCreating(false);
    }
  }

  if (presetGoal || creating) {
    return <div className="text-sm text-muted-foreground">Creating your email…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">What is this email for?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a goal — we&apos;ll suggest a subject and keep the editor simple.
      </p>
      <div className="mt-8 grid gap-3">
        {CAMPAIGN_GOALS.map((g) => (
          <button
            key={g.id}
            type="button"
            disabled={creating}
            onClick={() => {
              setGoal(g.id);
              void create(g.id);
            }}
            className={`rounded-xl border bg-white p-5 text-left hover:border-coral ${
              goal === g.id ? "border-coral" : ""
            }`}
          >
            <div className="font-medium">{g.label}</div>
            <div className="mt-1 text-sm text-muted-foreground">{g.description}</div>
          </button>
        ))}
      </div>
      <Button className="mt-6" variant="ghost" asChild>
        <Link href="/library">Browse templates instead</Link>
      </Button>
    </div>
  );
}
