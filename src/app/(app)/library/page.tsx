"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type Template = { id: string; name: string; updatedAt: string };

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    })();
  }, []);

  async function create() {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled template" }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    toast.success("Template created — open a campaign to use designs from templates");
    setTemplates((t) => [data.template, ...t]);
  }

  async function applyTemplateToCampaign(templateId: string) {
    const tRes = await fetch(`/api/templates/${templateId}`);
    const tData = await tRes.json();
    if (!tRes.ok) return toast.error("Failed to load template");

    const cRes = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tData.template.name }),
    });
    const cData = await cRes.json();
    if (!cRes.ok) return toast.error("Failed to create campaign");

    await fetch(`/api/campaigns/${cData.campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        designJson: tData.template.designJson,
        compiledHtml: tData.template.compiledHtml,
      }),
    });

    router.push(`/campaigns/${cData.campaign.id}`);
  }

  return (
    <div>
      <PageHeader title="Templates" description="Reusable email designs.">
        <Button onClick={() => void create()}>New template</Button>
      </PageHeader>

      {templates.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No templates yet"
          description="Save designs you reuse across campaigns."
          action={<Button onClick={() => void create()}>Create template</Button>}
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-muted-foreground">{formatDate(t.updatedAt)}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => void applyTemplateToCampaign(t.id)}>
                Use in campaign
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
