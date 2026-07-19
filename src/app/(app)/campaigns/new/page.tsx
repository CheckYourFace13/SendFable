"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewCampaignPage() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled campaign" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create campaign");
        router.replace("/campaigns");
        return;
      }
      router.replace(`/campaigns/${data.campaign.id}`);
    })();
  }, [router]);

  return <div className="text-sm text-muted-foreground">Creating campaign…</div>;
}
