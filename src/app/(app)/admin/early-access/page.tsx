"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
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

export default function AdminEarlyAccessPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/early-access");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Forbidden");
      return;
    }
    setLeads(data.leads || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(id: string, inviteStatus: string) {
    const res = await fetch("/api/admin/early-access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, inviteStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error || "Update failed");
    }
    toast.success("Updated");
    void load();
  }

  if (error) return <p className="text-sm text-red-700">{error}</p>;

  return (
    <div>
      <PageHeader
        title="Early access leads"
        description="Waitlist submissions. No automatic invites or marketing email while SES is off."
      >
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/api/admin/early-access?format=csv">Export CSV</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">Admin home</Link>
          </Button>
        </div>
      </PageHeader>
      <div className="rounded-xl border bg-white overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Goal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No leads yet.
                </TableCell>
              </TableRow>
            )}
            {leads.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">
                  <div>{l.email}</div>
                  <div className="text-xs text-muted-foreground">{l.firstName || ""}</div>
                </TableCell>
                <TableCell>
                  <div>{l.businessName || "—"}</div>
                  <div className="text-xs text-muted-foreground">{l.website || ""}</div>
                </TableCell>
                <TableCell>{l.contactCountApprox || "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{l.mainGoal || "—"}</TableCell>
                <TableCell>
                  <Select
                    value={l.inviteStatus}
                    onValueChange={(v) => void updateStatus(l.id, v)}
                  >
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">NEW</SelectItem>
                      <SelectItem value="CONTACTED">CONTACTED</SelectItem>
                      <SelectItem value="INVITED">INVITED</SelectItem>
                      <SelectItem value="DECLINED">DECLINED</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
