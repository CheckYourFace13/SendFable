"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";

type Campaign = {
  id: string;
  name: string;
  status: string;
  subject: string | null;
  sentCount: number;
  openCount: number;
  clickCount: number;
  updatedAt: string;
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setLoading(false);
    })();
  }, []);

  async function create() {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled campaign" }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    router.push(`/campaigns/${data.campaign.id}`);
  }

  return (
    <div>
      <PageHeader title="Campaigns" description="Design, schedule, and measure emails.">
        <Button onClick={() => void create()}>New campaign</Button>
      </PageHeader>

      {!loading && campaigns.length === 0 ? (
        <EmptyState
          icon={<Send />}
          title="Create your first campaign"
          description="Start from a simple email — or open Templates if you want a saved design."
          action={
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Button onClick={() => void create()}>Create your first campaign</Button>
              <Button asChild variant="outline">
                <Link href="/library">Browse templates</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {campaigns.map((c) => (
            <li key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
                <Link href={`/campaigns/${c.id}`} className="min-w-0 flex-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {c.subject || "No subject"} · {formatDate(c.updatedAt)}
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {formatNumber(c.sentCount)} sent · {formatNumber(c.openCount)} opens
                  </span>
                  <Badge variant="secondary">{c.status}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const res = await fetch(`/api/campaigns/${c.id}/duplicate`, {
                        method: "POST",
                      });
                      const data = await res.json();
                      if (!res.ok) return toast.error(data.error || "Could not copy");
                      router.push(`/campaigns/${data.campaign.id}`);
                    }}
                  >
                    Reuse
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
