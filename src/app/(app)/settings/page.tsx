"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [identities, setIdentities] = useState<any[]>([]);
  const [defaultSender, setDefaultSender] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    void (async () => {
      // Workspace fields come from a lightweight bootstrap via identities + team
      const [iRes, tRes, dash] = await Promise.all([
        fetch("/api/identities"),
        fetch("/api/settings/team"),
        fetch("/api/settings/me").catch(() => null),
      ]);
      void dash;
      const iData = await iRes.json();
      setIdentities((iData.identities || []).filter((i: any) => i.value.includes("@")));
      const tData = await tRes.json();
      setMembers(tData.members || []);

      // Load workspace via dedicated endpoint — add GET if missing, use patch bootstrap
      const wRes = await fetch("/api/settings/workspace", { method: "GET" }).catch(() => null);
      if (wRes && wRes.ok) {
        const w = await wRes.json();
        setName(w.workspace.name);
        setMailingAddress(w.workspace.mailingAddress || "");
        setTimezone(w.workspace.timezone || "UTC");
        setDefaultSender(w.workspace.defaultSenderIdentityId || "");
      }
    })();
  }, []);

  async function save() {
    const res = await fetch("/api/settings/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mailingAddress,
        timezone,
        defaultSenderIdentityId: defaultSender || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Save failed");
    toast.success("Settings saved");
  }

  async function invite() {
    const res = await fetch("/api/settings/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: "MEMBER" }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Invite failed");
    toast.success("Invitation sent");
    setInviteEmail("");
  }

  async function deleteWorkspace() {
    const res = await fetch("/api/settings/workspace", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      return toast.error(data.error || "Delete failed");
    }
    toast.success("Workspace deleted");
    router.push("/signup");
  }

  return (
    <div>
      <PageHeader title="Settings" description="Workspace, team, and danger zone." />

      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/senders">Manage sender identities →</Link>
        </Button>
      </div>

      <div className="mb-8 max-w-xl space-y-4 rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Workspace</h3>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Physical mailing address (required before sending)</Label>
          <Textarea
            value={mailingAddress}
            onChange={(e) => setMailingAddress(e.target.value)}
            placeholder="123 Main St, City, ST 12345, Country"
            rows={3}
          />
        </div>
        <div>
          <Label>Timezone</Label>
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </div>
        <div>
          <Label>Default sender</Label>
          <Select value={defaultSender} onValueChange={setDefaultSender}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {identities
                .filter((i) => i.status === "VERIFIED")
                .map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.value}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => void save()}>Save settings</Button>
      </div>

      <div className="mb-8 max-w-xl space-y-4 rounded-xl border bg-white p-6">
        <h3 className="font-semibold">Team (Pro)</h3>
        <ul className="divide-y text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between py-2">
              <span>{m.user.email}</span>
              <span className="text-muted-foreground">{m.role}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Button variant="outline" onClick={() => void invite()}>
            Invite
          </Button>
        </div>
      </div>

      <div className="max-w-xl rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-900">Danger zone</h3>
        <p className="mt-1 text-sm text-red-800">
          Delete this workspace and all contacts, campaigns, and data. This cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4">
              Delete workspace
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
              <AlertDialogDescription>
                All contacts, campaigns, and settings will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void deleteWorkspace()}>
                Delete forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
