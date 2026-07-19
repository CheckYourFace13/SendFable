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

type FieldKey = "email" | "firstName" | "lastName" | "skip" | "tag";

const FIELDS: Array<{ key: FieldKey; label: string }> = [
  { key: "email", label: "Email" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "tag", label: "Tag" },
  { key: "skip", label: "Skip" },
];

export default function ImportContactsPage() {
  const router = useRouter();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey>>({});
  const [loading, setLoading] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [rampLevel, setRampLevel] = useState(1);

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
          else if (lower.includes("first")) auto[i] = "firstName";
          else if (lower.includes("last")) auto[i] = "lastName";
          else if (lower.includes("tag")) auto[i] = "tag";
          else auto[i] = "skip";
        });
        setMapping(auto);
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  }

  const preview = useMemo(() => {
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
      }
      valid.push(contact);
    }
    return { valid, invalid, dupes };
  }, [rows, mapping]);

  async function commit(confirmPolicy = false) {
    if (!preview.valid.length) return toast.error("No valid rows to import");
    if (!confirmPolicy && preview.valid.length > 1000 && rampLevel === 1) {
      // fetch ramp level
      const me = await fetch("/api/settings/workspace").catch(() => null);
      void me;
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
        description="Upload a CSV, map columns, review, then commit."
      />

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
          <div className="mb-6 rounded-xl border bg-white p-6">
            <h3 className="font-semibold">Column mapping</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h, i) => (
                <div key={i}>
                  <Label className="text-xs text-muted-foreground">{h || `Column ${i + 1}`}</Label>
                  <Select
                    value={mapping[i] || "skip"}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [i]: v as FieldKey }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="font-medium">{preview.valid.length} valid</span>
            <span className="text-muted-foreground">{preview.invalid} invalid</span>
            <span className="text-muted-foreground">{preview.dupes} duplicates in file</span>
          </div>

          <div className="mb-6 max-h-80 overflow-auto rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>First name</TableHead>
                  <TableHead>Last name</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.valid.slice(0, 50).map((c) => (
                  <TableRow key={c.email}>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.firstName || "—"}</TableCell>
                    <TableCell>{c.lastName || "—"}</TableCell>
                    <TableCell>{c.tagNames?.join(", ") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button disabled={loading || !preview.valid.length} onClick={() => void commit(false)}>
            {loading ? "Importing…" : `Import ${preview.valid.length} contacts`}
          </Button>
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
