"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Form = { id: string; name: string; hostedSlug: string; submitCount: number };

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/forms");
      const data = await res.json();
      setForms(data.forms || []);
    })();
  }, []);

  async function create() {
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    router.push(`/forms/${data.form.id}`);
  }

  return (
    <div>
      <PageHeader title="Signup forms" description="Hosted pages and embeddable snippets.">
        <div className="flex gap-2">
          <Input
            placeholder="Newsletter signup"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-52"
          />
          <Button onClick={() => void create()} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </PageHeader>

      {forms.length === 0 ? (
        <EmptyState
          icon={<ListChecks />}
          title="No forms yet"
          description="Create a hosted signup form to grow your list."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {forms.map((f) => (
            <li key={f.id}>
              <Link
                href={`/forms/${f.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-sm text-muted-foreground">/f/{f.hostedSlug}</div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {f.submitCount} submissions
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
