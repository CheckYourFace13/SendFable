"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tags } from "lucide-react";

type Tag = { id: string; name: string; color: string; _count?: { contacts: number } };

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4F46E5");

  async function load() {
    const res = await fetch("/api/tags");
    const data = await res.json();
    setTags(data.tags || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    toast.success("Tag created");
    setName("");
    void load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to delete");
    toast.success("Tag deleted");
    void load();
  }

  return (
    <div>
      <PageHeader title="Tags" description="Organize contacts for targeting." />

      <div className="mb-8 grid max-w-md gap-3 rounded-xl border bg-white p-6">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VIP" />
        </div>
        <div>
          <Label>Color</Label>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20 p-1" />
        </div>
        <Button onClick={() => void create()} disabled={!name.trim()}>
          Create tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="No tags yet"
          description="Create tags to segment your audience for campaigns."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {tags.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="font-medium">{t.name}</span>
                <span className="text-sm text-muted-foreground">
                  {t._count?.contacts ?? 0} contacts
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => void remove(t.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
