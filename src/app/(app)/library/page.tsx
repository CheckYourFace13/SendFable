"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  updatedAt: string;
  isPlatform?: boolean;
  category?: string | null;
  industry?: string | null;
  suggestedPreviewText?: string | null;
};

export default function TemplatesPage() {
  const router = useRouter();
  const search = useSearchParams();
  const autoUse = search.get("use");
  const [platform, setPlatform] = useState<Template[]>([]);
  const [workspace, setWorkspace] = useState<Template[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/templates?platform=1");
      const data = await res.json();
      setPlatform(data.platform || []);
      setWorkspace(data.workspace || []);
      if (autoUse) {
        await applyTemplateToCampaign(autoUse);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled template" }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    toast.success("Template created");
    setWorkspace((t) => [data.template, ...t]);
  }

  async function applyTemplateToCampaign(templateId: string) {
    const cRes = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "From template", templateId, simpleMode: true }),
    });
    const cData = await cRes.json();
    if (!cRes.ok) return toast.error(cData.error || "Failed to create campaign");
    router.push(`/campaigns/${cData.campaign.id}`);
  }

  const empty = platform.length === 0 && workspace.length === 0;

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Start from a ready design or reuse one you saved."
      >
        <Button onClick={() => void create()}>New template</Button>
      </PageHeader>

      {empty ? (
        <EmptyState
          icon={<FileText />}
          title="No templates yet"
          description="Create a campaign now, or save a blank template to reuse later."
          action={
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Button onClick={() => router.push("/campaigns/new")}>Create a campaign</Button>
              <Button variant="outline" onClick={() => void create()}>
                Save a blank template
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-10">
          {platform.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Ready-made templates
              </h2>
              <ul className="divide-y rounded-xl border bg-white">
                {platform.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        {t.category && (
                          <Badge variant="secondary" className="text-xs">
                            {t.category}
                          </Badge>
                        )}
                      </div>
                      {t.suggestedPreviewText && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {t.suggestedPreviewText}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void applyTemplateToCampaign(t.id)}
                    >
                      Use in campaign
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {workspace.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Your saved designs
              </h2>
              <ul className="divide-y rounded-xl border bg-white">
                {workspace.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(t.updatedAt)}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void applyTemplateToCampaign(t.id)}
                    >
                      Use in campaign
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
