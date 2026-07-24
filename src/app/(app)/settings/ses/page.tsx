"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChecklistItem {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

interface Report {
  region: string;
  platformSendDomain: string | null;
  configurationSet: string | null;
  awsCredentialsConfigured: boolean;
  devMailMode: boolean;
  sandbox: boolean | null;
  domainVerified: boolean | null;
  dkimStatus: string | null;
  mailFromDomain: string | null;
  mailFromStatus: string | null;
  configurationSetPresent: boolean | null;
  snsEventDestinationPresent: boolean | null;
  redisConfigured: boolean;
  redisReachable: boolean | null;
  queueConfigured: boolean;
  checklist: ChecklistItem[];
}

export default function SesReadinessPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/ses-readiness");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Unable to load readiness");
        setLoading(false);
        return;
      }
      setReport(data.report);
      setInstructions(data.setupInstructions || "");
      setLoading(false);
    })();
  }, []);

  async function copyInstructions() {
    try {
      await navigator.clipboard.writeText(instructions);
      toast.success("Setup instructions copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading SES readiness…</div>;
  }

  if (error) {
    return (
      <div>
        <PageHeader title="SES readiness" description="Owner-only delivery setup checklist." />
        <p className="text-sm text-red-700">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/settings">← Back to settings</Link>
        </Button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div>
      <PageHeader
        title="SES readiness"
        description="Safe checklist of delivery configuration. Secrets are never shown."
      >
        <Button variant="outline" size="sm" onClick={() => void copyInstructions()}>
          Copy setup instructions
        </Button>
      </PageHeader>

      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings">← Settings</Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Region" value={report.region} />
        <Meta label="Platform domain" value={report.platformSendDomain || "—"} />
        <Meta label="Configuration set" value={report.configurationSet || "—"} />
        <Meta
          label="Mail mode"
          value={report.devMailMode ? "Local .eml outbox" : "Amazon SES"}
        />
        <Meta
          label="Sandbox"
          value={
            report.sandbox === null ? "—" : report.sandbox ? "true" : "false"
          }
        />
        <Meta
          label="Domain verified"
          value={
            report.domainVerified === null
              ? "—"
              : report.domainVerified
                ? "yes"
                : "no"
          }
        />
        <Meta label="DKIM" value={report.dkimStatus || "—"} />
        <Meta
          label="MAIL FROM"
          value={
            report.mailFromStatus
              ? `${report.mailFromDomain || "—"} (${report.mailFromStatus})`
              : "—"
          }
        />
        <Meta
          label="SNS destination"
          value={
            report.snsEventDestinationPresent === null
              ? "—"
              : report.snsEventDestinationPresent
                ? "present"
                : "missing"
          }
        />
        <Meta
          label="Redis"
          value={
            !report.redisConfigured
              ? "Not configured"
              : report.redisReachable === false
                ? "Unreachable"
                : "Configured"
          }
        />
        <Meta label="Queue" value={report.queueConfigured ? "BullMQ" : "Inline"} />
      </div>

      <div className="max-w-2xl space-y-3 rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Checklist</h3>
        <ul className="divide-y">
          {report.checklist.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                {item.detail && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.detail}</div>
                )}
              </div>
              <Badge variant={item.ok ? "default" : "secondary"}>
                {item.ok ? "Ready" : "Needs setup"}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}
