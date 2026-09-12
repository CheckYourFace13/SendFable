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
import { Input } from "@/components/ui/input";
import { isValidEmail, normalizeEmail } from "@/lib/utils";

type FieldKey = "email" | "phone" | "firstName" | "lastName" | "skip" | "tag" | "smsConsent";
type SmsConsentMode = "none" | "explicit-fields" | "owner-attestation" | "documented-source";

type MappedContact = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  tagNames?: string[];
  smsConsent?: boolean;
};

const FIELDS: Array<{ key: FieldKey; label: string }> = [
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "smsConsent", label: "SMS consent (yes/no)" },
  { key: "tag", label: "Tag" },
  { key: "skip", label: "Skip" },
];

function parseConsentCell(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return ["1", "true", "yes", "y", "opted-in", "subscribed", "consent"].includes(v);
}

export default function ImportContactsPage() {
  const router = useRouter();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey>>({});
  const [loading, setLoading] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [rampLevel, setRampLevel] = useState(1);
  const [smsConsentMode, setSmsConsentMode] = useState<SmsConsentMode>("none");
  const [ownerAttestation, setOwnerAttestation] = useState("");
  const [smsConsentSource, setSmsConsentSource] = useState("");
  const [serverPreview, setServerPreview] = useState<{
    existing?: number;
    suppressed?: number;
    wouldCreate?: number;
  } | null>(null);
  const [step, setStep] = useState<"upload" | "map" | "review">("upload");

  function onFile(file: File) {
    Papa.parse<string[]>(file, {
      complete: (result) => {
        const data = result.data.filter((r) => r.some((c) => String(c).trim()));
        if (!data.length) return toast.error("Empty CSV");
        const hdrs = data[0].map((h) => String(h).trim());
        const body = data.slice(1);
        setHeaders(hdrs);
        setRows(body);
        const auto: Record<number, FieldKey> = {};
        hdrs.forEach((h, i) => {
          const lower = h.toLowerCase();
          if (lower.includes("email") || lower === "e-mail") auto[i] = "email";
          else if (lower.includes("phone") || lower.includes("mobile") || lower.includes("sms"))
            auto[i] = "phone";
          else if (lower.includes("consent") || lower.includes("opt")) auto[i] = "smsConsent";
          else if (lower.includes("first")) auto[i] = "firstName";
          else if (lower.includes("last")) auto[i] = "lastName";
          else if (lower.includes("tag")) auto[i] = "tag";
          else auto[i] = "skip";
        });
        setMapping(auto);
        setServerPreview(null);
        setStep("map");
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  }

  async function runDryRun(contacts: MappedContact[]) {
    const res = await fetch("/api/contacts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contacts,
        dryRun: true,
        confirmPurchasedListsPolicy: true,
        smsConsentMode,
        ownerAttestation: ownerAttestation || undefined,
        smsConsentSource: smsConsentSource || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Preview failed");
      return;
    }
    setServerPreview({
      existing: data.existing,
      suppressed: data.suppressed,
      wouldCreate: data.wouldCreate,
    });
    setStep("review");
  }

  const preview = useMemo(() => {
    const emailCol = Object.entries(mapping).find(([, v]) => v === "email")?.[0];
    const phoneCol = Object.entries(mapping).find(([, v]) => v === "phone")?.[0];
    if (emailCol === undefined && phoneCol === undefined) {
      return { valid: [] as MappedContact[], invalid: 0, dupes: 0 };
    }
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    let invalid = 0;
    let dupes = 0;
    const valid: MappedContact[] = [];

    for (const row of rows) {
      const emailRaw =
        emailCol !== undefined ? normalizeEmail(String(row[Number(emailCol)] || "")) : "";
      const phoneRaw =
        phoneCol !== undefined ? String(row[Number(phoneCol)] || "").trim() : "";
      const emailOk = emailRaw ? isValidEmail(emailRaw) : false;
      if (emailRaw && !emailOk) {
        invalid++;
        continue;
      }
      if (!emailOk && !phoneRaw) {
        invalid++;
        continue;
      }
      if (emailOk && seenEmails.has(emailRaw)) {
        dupes++;
        continue;
      }
      if (phoneRaw && seenPhones.has(phoneRaw)) {
        dupes++;
        continue;
      }
      if (emailOk) seenEmails.add(emailRaw);
      if (phoneRaw) seenPhones.add(phoneRaw);

      const contact: MappedContact = {};
      if (emailOk) contact.email = emailRaw;
      if (phoneRaw) contact.phone = phoneRaw;
      for (const [col, field] of Object.entries(mapping)) {
        const val = String(row[Number(col)] || "").trim();
        if (!val) continue;
        if (field === "firstName") contact.firstName = val;
        if (field === "lastName") contact.lastName = val;
        if (field === "tag") contact.tagNames = [val];
        if (field === "smsConsent") contact.smsConsent = parseConsentCell(val);
      }
      valid.push(contact);
    }
    return { valid, invalid, dupes };
  }, [rows, mapping]);

  async function commit(confirmPolicy = false) {
    if (!preview.valid.length) return toast.error("No valid rows to import");
    if (smsConsentMode === "owner-attestation" && !ownerAttestation.trim()) {
      return toast.error("Owner attestation is required for this SMS consent mode");
    }
    if (smsConsentMode === "documented-source" && !smsConsentSource.trim()) {
      return toast.error("Consent source is required for documented SMS consent");
    }
    if (!confirmPolicy && preview.valid.length > 1000 && rampLevel === 1) {
      setPolicyOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: preview.valid,
          confirmPurchasedListsPolicy: confirmPolicy || preview.valid.length <= 1000,
          smsConsentMode,
          ownerAttestation: ownerAttestation || undefined,
          smsConsentSource: smsConsentSource || undefined,
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

  return (
    <div>
      <PageHeader
        title="Import contacts"
        description="Upload → map columns → review → import. Email-only, phone-only, or both. SMS consent is never inferred."
      />

      <ol className="mb-6 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {(["upload", "map", "review"] as const).map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1 ${step === s ? "bg-ink text-page" : "bg-parchment"}`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="mb-6 rounded-xl border bg-white p-6">
        <Label>CSV file</Label>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-2 block w-full text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>

      {headers.length > 0 && (
        <>
          <div className="mb-6 rounded-xl border bg-white p-6 space-y-4">
            <h3 className="font-semibold">Column mapping</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h, i) => (
                <div key={i}>
                  <Label className="text-xs text-muted-foreground">{h || `Column ${i + 1}`}</Label>
                  <Select
                    value={mapping[i] || "skip"}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [i]: v as FieldKey }))}
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

            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold">SMS marketing consent for this import</h4>
              <p className="text-xs text-muted-foreground">
                Phones are stored without SMS permission unless you choose a documented mode.
                STOP/opt-out always wins over re-import.
              </p>
              <Select
                value={smsConsentMode}
                onValueChange={(v) => setSmsConsentMode(v as SmsConsentMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No SMS consent (store phones only)</SelectItem>
                  <SelectItem value="explicit-fields">Use SMS consent column per row</SelectItem>
                  <SelectItem value="owner-attestation">Owner attestation for whole file</SelectItem>
                  <SelectItem value="documented-source">Documented consent source for whole file</SelectItem>
                </SelectContent>
              </Select>
              {smsConsentMode === "owner-attestation" && (
                <div>
                  <Label>Attestation</Label>
                  <Input
                    className="mt-1"
                    value={ownerAttestation}
                    onChange={(e) => setOwnerAttestation(e.target.value)}
                    placeholder="I confirm these contacts opted in to SMS from my business"
                  />
                </div>
              )}
              {smsConsentMode === "documented-source" && (
                <div>
                  <Label>Consent source</Label>
                  <Input
                    className="mt-1"
                    value={smsConsentSource}
                    onChange={(e) => setSmsConsentSource(e.target.value)}
                    placeholder="e.g. checkout form 2026-03, paper signup sheet"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="font-medium">{preview.valid.length} valid in file</span>
            <span className="text-muted-foreground">{preview.invalid} invalid</span>
            <span className="text-muted-foreground">{preview.dupes} duplicates in file</span>
            {serverPreview && (
              <>
                <span className="text-muted-foreground">
                  {serverPreview.wouldCreate ?? 0} would be created
                </span>
                <span className="text-muted-foreground">
                  {serverPreview.existing ?? 0} already in audience
                </span>
                <span className="text-muted-foreground">
                  {serverPreview.suppressed ?? 0} suppressed
                </span>
              </>
            )}
          </div>

          <div className="mb-6 max-h-80 overflow-auto rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>First name</TableHead>
                  <TableHead>Last name</TableHead>
                  <TableHead>SMS consent</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.valid.slice(0, 50).map((c, i) => (
                  <TableRow key={`${c.email || ""}-${c.phone || ""}-${i}`}>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell>{c.firstName || "—"}</TableCell>
                    <TableCell>{c.lastName || "—"}</TableCell>
                    <TableCell>
                      {c.smsConsent === true ? "yes" : c.smsConsent === false ? "no" : "—"}
                    </TableCell>
                    <TableCell>{c.tagNames?.join(", ") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!preview.valid.length || loading}
              onClick={() => void runDryRun(preview.valid)}
            >
              Review against audience
            </Button>
            <Button disabled={loading || !preview.valid.length} onClick={() => void commit(false)}>
              {loading
                ? "Importing…"
                : `Import ${serverPreview?.wouldCreate ?? preview.valid.length} contacts`}
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm list quality</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re importing more than 1,000 contacts on a new account. Sendfable strictly
              prohibits purchased, rented, or scraped lists. Confirm these contacts opted in to hear
              from you. Violations can result in immediate account termination.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRampLevel(1);
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
