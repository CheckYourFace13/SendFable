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
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    void (async () => {
      const res = await fetch("/api/forms");
      const data = await res.json();
      setForms(data.forms || []);
    })();
  }, []);

  async function create(forcedName?: string) {
    const formName = (forcedName ?? name).trim();
    if (!formName) return toast.error("Name your form");
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName }),
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
          title="Grow your list with a signup form"
          description="Share a simple page so new people can join with permission."
          action={
            <Button onClick={() => void create("Newsletter signup")}>Create signup form</Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {forms.map((f) => {
            const hosted = `${origin}/f/${f.hostedSlug}`;
            const embed = `<iframe src="${hosted}?embed=1" style="width:100%;max-width:420px;height:360px;border:0;" title="${f.name}"></iframe>`;
            return (
              <li key={f.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/forms/${f.id}`} className="min-w-0">
                  <div className="font-medium">{f.name}</div>
                  <div className="truncate text-sm text-muted-foreground">{hosted}</div>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{f.submitCount} submissions</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(hosted);
                      toast.success("Hosted form link copied");
                    }}
                  >
                    Copy hosted form link
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(embed);
                      toast.success("Embed code copied");
                    }}
                  >
                    Copy embed code
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a href={hosted} target="_blank" rel="noreferrer">
                      Preview form
                    </a>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
