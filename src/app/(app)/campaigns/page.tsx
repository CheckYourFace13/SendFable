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
          title="No campaigns yet"
          description="Create a campaign to reach your audience."
          action={<Button onClick={() => void create()}>Create campaign</Button>}
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link
                href={`/campaigns/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {c.subject || "No subject"} · {formatDate(c.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {formatNumber(c.sentCount)} sent · {formatNumber(c.openCount)} opens
                  </span>
                  <Badge variant="secondary">{c.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
