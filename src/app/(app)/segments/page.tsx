"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3 } from "lucide-react";

type Segment = { id: string; name: string; count?: number };

export default function SegmentsPage() {
  const router = useRouter();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/segments");
    const data = await res.json();
    setSegments(data.segments || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    const res = await fetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        rules: { match: "all", conditions: [{ field: "status", operator: "eq", value: "SUBSCRIBED" }] },
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    router.push(`/segments/${data.segment.id}`);
  }

  return (
    <div>
      <PageHeader title="Segments" description="Dynamic audiences based on rules.">
        <div className="flex gap-2">
          <Input
            placeholder="New segment name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48"
          />
          <Button onClick={() => void create()} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </PageHeader>

      {segments.length === 0 ? (
        <EmptyState
          icon={<BarChart3 />}
          title="No segments yet"
          description="Build rule-based audiences with live contact counts."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {segments.map((s) => (
            <li key={s.id}>
              <Link
                href={`/segments/${s.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-muted-foreground">
                  {(s.count ?? 0).toLocaleString()} contacts
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
