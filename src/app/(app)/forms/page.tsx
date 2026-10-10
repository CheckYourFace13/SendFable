"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ListChecks } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { embedSnippet } from "@/lib/forms/install";

type Form = {
  id: string;
  name: string;
  hostedSlug: string;
  submitCount: number;
  status: string;
  audienceName: string | null;
  fieldSummary: string;
};

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Form | null>(null);

  async function load() {
    const res = await fetch("/api/forms");
    const data = await res.json();
    setForms(data.forms || []);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    void load();
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

  async function setStatus(form: Form, status: "ACTIVE" | "PAUSED") {
    const res = await fetch(`/api/forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Could not update this form");
    toast.success(status === "PAUSED" ? "Form paused" : "Form resumed");
    await load();
  }

  async function remove(form: Form) {
    const res = await fetch(`/api/forms/${form.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Could not delete this form");
    toast.success("Form deleted. Existing subscribers stay in their audience.");
    setPendingDelete(null);
    await load();
  }

  return (
    <div>
      <PageHeader title="Signup tools" description="Give people an easy way to join your audience.">
        <div className="flex gap-2">
          <Input
            placeholder="Newsletter signup"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-52"
            aria-label="New form name"
          />
          <Button onClick={() => void create()} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </PageHeader>

      {forms.length === 0 ? (
        <EmptyState
          icon={<ListChecks />}
          title="Give people an easy way to join"
          description="Share a simple page so new people can join with permission."
          action={
            <Button onClick={() => void create("Newsletter signup")}>Create signup form</Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {forms.map((f) => {
            const hosted = `${origin}/f/${f.hostedSlug}`;
            const embed = origin ? embedSnippet(origin, f.hostedSlug) : "";
            const paused = f.status === "PAUSED";
            return (
              <li key={f.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/forms/${f.id}`} className="font-medium hover:underline">
                      {f.name}
                    </Link>
                    <Badge variant={paused ? "warning" : "success"}>{paused ? "Paused" : "Active"}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Audience: {f.audienceName || "Choose an audience"}
                  </div>
                  {f.fieldSummary && (
                    <div className="text-sm text-muted-foreground">Fields: {f.fieldSummary}</div>
                  )}
                  <div className="truncate text-sm text-muted-foreground">{hosted}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{f.submitCount} submissions</span>
                  <Button type="button" size="sm" asChild>
                    <Link href={`/forms/${f.id}`}>Edit</Link>
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a href={hosted} target="_blank" rel="noreferrer">Preview</a>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(hosted);
                      toast.success("Hosted form link copied");
                    }}
                  >
                    Copy link
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
                    Copy embed
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="sm" variant="outline" aria-label={`More actions for ${f.name}`}>
                        More <ChevronDown className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void setStatus(f, paused ? "ACTIVE" : "PAUSED")}>
                        {paused ? "Resume form" : "Pause form"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => setPendingDelete(f)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Future signups stop, and the installed link or embed will stop working. Existing subscribers stay in their audience. Campaign history and contact data are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => pendingDelete && void remove(pendingDelete)}
            >
              Delete form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
