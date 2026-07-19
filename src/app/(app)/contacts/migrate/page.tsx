"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isValidEmail, normalizeEmail } from "@/lib/utils";
import {
  MIGRATION_PROVIDER_LIST,
  detectColumnMapping,
  mapProviderStatus,
  type MigrationField,
  type MigrationProvider,
} from "@/lib/migration-presets";

const FIELDS: Array<{ key: MigrationField; label: string }> = [
  { key: "email", label: "Email" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "status", label: "Subscription status" },
  { key: "tag", label: "Tag" },
  { key: "skip", label: "Skip" },
];

type Step = "provider" | "upload" | "review";

export default function MigratePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<MigrationProvider>("mailchimp");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, MigrationField>>({});
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [serverPreview, setServerPreview] = useState<{
    wouldCreate: number;
    invalid: number;
    duplicates: number;
    existing: number;
    suppressed: number;
    statusUpdates: number;
    skippedCap: number;
  } | null>(null);

  function onFile(file: File) {
    Papa.parse<string[]>(file, {
      complete: (result) => {
        const data = result.data.filter((r) => r.some((c) => String(c).trim()));
        if (!data.length) return toast.error("Empty CSV");
        const hdrs = data[0].map((h) => String(h).trim());
        const body = data.slice(1);
        setHeaders(hdrs);
        setRows(body);
        setMapping(detectColumnMapping(hdrs, provider));
        setServerPreview(null);
        setStep("review");
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  }

  const contacts = useMemo(() => {
    const emailCol = Object.entries(mapping).find(([, v]) => v === "email")?.[0];
    if (emailCol === undefined) return { valid: [], invalid: 0, dupes: 0 };

    const seen = new Set<string>();
    let invalid = 0;
    let dupes = 0;
    const valid: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      tagNames?: string[];
      status?: string;
    }> = [];

    for (const row of rows) {
      const email = normalizeEmail(String(row[Number(emailCol)] || ""));
      if (!isValidEmail(email)) {
        invalid++;
        continue;
      }
      if (seen.has(email)) {
        dupes++;
        continue;
      }
      seen.add(email);
      const contact: (typeof valid)[0] = { email };
      for (const [col, field] of Object.entries(mapping)) {
        const val = String(row[Number(col)] || "").trim();
        if (!val) continue;
        if (field === "firstName") contact.firstName = val;
        if (field === "lastName") contact.lastName = val;
        if (field === "tag") contact.tagNames = [val];
        if (field === "status") contact.status = mapProviderStatus(provider, val);
      }
      if (!contact.status) contact.status = "SUBSCRIBED";
      valid.push(contact);
    }
    return { valid, invalid, dupes };
  }, [rows, mapping, provider]);

  async function runDryRun() {
    if (!contacts.valid.length) return toast.error("No valid rows to import");
    setPreviewing(true);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: contacts.valid,
          provider,
          dryRun: true,
          confirmPurchasedListsPolicy: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setServerPreview({
        wouldCreate: data.wouldCreate ?? 0,
        invalid: data.invalid ?? 0,
        duplicates: data.duplicates ?? 0,
        existing: data.existing ?? 0,
        suppressed: data.suppressed ?? 0,
        statusUpdates: data.statusUpdates ?? 0,
        skippedCap: data.skippedCap ?? 0,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function commit(confirmPolicy = false) {
    if (!contacts.valid.length) return toast.error("No valid rows to import");
    if (!confirmPolicy && contacts.valid.length > 1000) {
      setPolicyOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: contacts.valid,
          provider,
          confirmPurchasedListsPolicy: confirmPolicy || contacts.valid.length <= 1000,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresPolicyConfirmation) {
          setPolicyOpen(true);
          return;
        }
        throw new Error(data.error || "Import failed");
      }
      toast.success(
        `Imported ${data.created}. ${data.duplicates} duplicates, ${data.invalid} invalid` +
          (data.skippedCap ? `, ${data.skippedCap} over cap` : "")
      );
      router.push("/contacts");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const preset = MIGRATION_PROVIDER_LIST.find((p) => p.id === provider)!;

  return (
    <div>
      <PageHeader
        title="Migration center"
        description="Move your list from another ESP. We preserve unsubscribed, bounced, and complained statuses."
      />

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {(["provider", "upload", "review"] as Step[]).map((s, i) => (
          <span
            key={s}
            className={
              step === s
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            }
          >
            {i + 1}. {s === "provider" ? "Provider" : s === "upload" ? "Upload" : "Review"}
            {i < 2 ? " →" : ""}
          </span>
        ))}
      </div>

      {step === "provider" && (
        <div className="mb-6 max-w-2xl rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Where are you coming from?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll pre-map common column names for that export format.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {MIGRATION_PROVIDER_LIST.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={
                  provider === p.id
                    ? "rounded-lg border-2 border-primary bg-primary/5 p-4 text-left"
                    : "rounded-lg border p-4 text-left hover:bg-muted/50"
                }
              >
                <div className="font-medium">{p.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
              </button>
            ))}
          </div>
          <Button className="mt-6" onClick={() => setStep("upload")}>
            Continue with {preset.label}
          </Button>
        </div>
      )}

      {step === "upload" && (
        <div className="mb-6 max-w-xl rounded-xl border bg-white p-6">
          <Label>CSV export from {preset.label}</Label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-2 block w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <Button variant="ghost" className="mt-4" onClick={() => setStep("provider")}>
            ← Change provider
          </Button>
        </div>
      )}

      {step === "review" && headers.length > 0 && (
        <>
          <div className="mb-6 rounded-xl border bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Column mapping ({preset.label})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHeaders([]);
                  setRows([]);
                  setServerPreview(null);
                  setStep("upload");
                }}
              >
                Upload a different file
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h, i) => (
                <div key={i}>
                  <Label className="text-xs text-muted-foreground">
                    {h || `Column ${i + 1}`}
                  </Label>
                  <Select
                    value={mapping[i] || "skip"}
                    onValueChange={(v) => {
                      setMapping((m) => ({ ...m, [i]: v as MigrationField }));
                      setServerPreview(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="font-medium">{contacts.valid.length} valid in file</span>
            <span className="text-muted-foreground">{contacts.invalid} invalid</span>
            <span className="text-muted-foreground">{contacts.dupes} duplicates in file</span>
          </div>

          {serverPreview && (
            <div className="mb-4 flex flex-wrap gap-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <span className="font-medium">{serverPreview.wouldCreate} new</span>
              <span>{serverPreview.existing} already in audience</span>
              <span>{serverPreview.suppressed} suppressed</span>
              <span>{serverPreview.duplicates} duplicates</span>
              <span>{serverPreview.invalid} invalid</span>
              {serverPreview.statusUpdates > 0 && (
                <span>{serverPreview.statusUpdates} status updates (never upgrades)</span>
              )}
              {serverPreview.skippedCap > 0 && (
                <span className="text-amber-700">{serverPreview.skippedCap} over plan cap</span>
              )}
            </div>
          )}

          <div className="mb-6 max-h-80 overflow-auto rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>First name</TableHead>
                  <TableHead>Last name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.valid.slice(0, 50).map((c) => (
                  <TableRow key={c.email}>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.firstName || "—"}</TableCell>
                    <TableCell>{c.lastName || "—"}</TableCell>
                    <TableCell>{c.status || "SUBSCRIBED"}</TableCell>
                    <TableCell>{c.tagNames?.join(", ") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={previewing || !contacts.valid.length}
              onClick={() => void runDryRun()}
            >
              {previewing ? "Checking…" : "Check against audience"}
            </Button>
            <Button
              disabled={loading || !contacts.valid.length}
              onClick={() => void commit(false)}
            >
              {loading
                ? "Importing…"
                : `Confirm import (${serverPreview?.wouldCreate ?? contacts.valid.length})`}
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm list quality</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re importing more than 1,000 contacts. Sendfable prohibits purchased,
              rented, or scraped lists. Confirm these contacts opted in to hear from you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPolicyOpen(false);
                void commit(true);
              }}
            >
              I confirm — these are opted-in contacts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
