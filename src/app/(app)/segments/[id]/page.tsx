"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SegmentCondition, SegmentRules } from "@/lib/segments";

const FIELDS = [
  { value: "email", label: "Email" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "status", label: "Status" },
  { value: "tag", label: "Tag" },
];

const OPS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with", label: "starts with" },
  { value: "is_set", label: "is set" },
  { value: "is_empty", label: "is empty" },
  { value: "in", label: "is one of" },
];

export default function SegmentEditorPage() {
  const params = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [rules, setRules] = useState<SegmentRules>({ match: "all", conditions: [] });
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/segments/${params.id}`);
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Not found");
      setName(data.segment.name);
      setRules(data.segment.rules);
      setCount(data.count);
      setLoading(false);
    })();
  }, [params.id]);

  async function preview(next = rules) {
    const res = await fetch("/api/segments/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    if (res.ok) setCount(data.count);
  }

  async function save() {
    const res = await fetch(`/api/segments/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rules }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Save failed");
    toast.success("Segment saved");
    void preview();
  }

  function updateCondition(i: number, patch: Partial<SegmentCondition>) {
    const conditions = rules.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    const next = { ...rules, conditions };
    setRules(next);
    void preview(next);
  }

  function addCondition() {
    const next = {
      ...rules,
      conditions: [
        ...rules.conditions,
        { field: "email", operator: "contains" as const, value: "" },
      ],
    };
    setRules(next);
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <PageHeader title="Edit segment" description="Rules update the live count as you type.">
        <Button onClick={() => void save()}>Save</Button>
      </PageHeader>

      <div className="mb-6 max-w-xl">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm">Match</span>
        <Select
          value={rules.match}
          onValueChange={(v) => {
            const next = { ...rules, match: v as "all" | "any" };
            setRules(next);
            void preview(next);
          }}
        >
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL conditions</SelectItem>
            <SelectItem value="any">ANY condition</SelectItem>
          </SelectContent>
        </Select>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          {count === null ? "…" : `${count.toLocaleString()} contacts`}
        </span>
      </div>

      <div className="space-y-3">
        {rules.conditions.map((c, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
            <div>
              <Label className="text-xs">Field</Label>
              <Select value={c.field} onValueChange={(v) => updateCondition(i, { field: v })}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Operator</Label>
              <Select
                value={c.operator}
                onValueChange={(v) => updateCondition(i, { operator: v as SegmentCondition["operator"] })}
              >
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!["is_set", "is_empty"].includes(c.operator) && (
              <div className="flex-1 min-w-[160px]">
                <Label className="text-xs">Value</Label>
                <Input
                  value={c.value || ""}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                />
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const next = {
                  ...rules,
                  conditions: rules.conditions.filter((_, idx) => idx !== i),
                };
                setRules(next);
                void preview(next);
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <Button className="mt-4" variant="outline" onClick={addCondition}>
        Add condition
      </Button>
    </div>
  );
}
