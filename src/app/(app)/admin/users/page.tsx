"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Forbidden");
        return;
      }
      setUsers(data.users || []);
    })();
  }, []);

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Platform accounts and workspace ownership."
      >
        <Link href="/admin" className="text-sm text-coral underline">
          Back to admin
        </Link>
      </PageHeader>
      <div className="rounded-xl border bg-white overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Hold</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Monthly sends</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const m = u.memberships?.[0];
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.plan}</TableCell>
                  <TableCell>{u.emailVerified ? "yes" : "no"}</TableCell>
                  <TableCell>{u.sendingHeldAt ? "held" : "ok"}</TableCell>
                  <TableCell>
                    {m ? `${m.workspace.name} (${m.role})` : "—"}
                  </TableCell>
                  <TableCell>{m?.workspace._count.contacts ?? 0}</TableCell>
                  <TableCell>{u.monthlySendCount}</TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
