"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Upload, Download, Plus, Search, Tags } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Contact = {
  id: string;
  email: string | null;
  phoneE164: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  status: string;
  smsStatus?: string;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
};

type Tag = { id: string; name: string; color: string };

function displayIdentity(c: Contact): string {
  if (c.email && c.phoneE164) return `${c.email} · ${c.phoneE164}`;
  if (c.email) return c.email;
  if (c.phoneE164) return c.phoneE164;
  return "—";
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [tagId, setTagId] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (tagId !== "all") params.set("tagId", tagId);
    const [cRes, tRes] = await Promise.all([
      fetch(`/api/contacts?${params}`),
      fetch("/api/tags"),
    ]);
    const cData = await cRes.json();
    const tData = await tRes.json();
    setContacts(cData.contacts || []);
    setTotal(cData.total || 0);
    setTags(tData.tags || []);
    setLoading(false);
  }, [page, q, status, tagId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function bulk(action: string, bulkTagId?: string) {
    const res = await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        contactIds: [...selected],
        tagId: bulkTagId,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    toast.success(`Updated ${data.updated} contacts`);
    setSelected(new Set());
    void load();
  }

  async function addContact() {
    if (!email.trim() && !phone.trim()) {
      return toast.error("Add an email, a mobile number, or both.");
    }
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim() || null,
        phone: phone.trim() || null,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        company: company.trim() || null,
        smsConsent: phone.trim() ? smsConsent : false,
        smsConsentSource: phone.trim() && smsConsent ? "manual" : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    toast.success("Contact added");
    setAddOpen(false);
    setEmail("");
    setPhone("");
    setFirstName("");
    setLastName("");
    setCompany("");
    setSmsConsent(false);
    void load();
  }

  const exportUrl = (() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (tagId !== "all") params.set("tagId", tagId);
    return `/api/contacts/export?${params}`;
  })();

  return (
    <div>
      <PageHeader title="Contacts" description={`${total.toLocaleString()} in your audience`}>
        <Button asChild variant="outline" size="sm">
          <a href={exportUrl}>
            <Download className="mr-2 h-4 w-4" /> Export
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/contacts/import">
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Link>
        </Button>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search email, phone, or name…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="SUBSCRIBED">Subscribed</SelectItem>
            <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
            <SelectItem value="BOUNCED">Bounced</SelectItem>
            <SelectItem value="COMPLAINED">Complained</SelectItem>
            <SelectItem value="PENDING_CONFIRM">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagId} onValueChange={(v) => { setPage(1); setTagId(v); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm">
          <span>{selected.size} selected</span>
          <Select onValueChange={(v) => void bulk("tag", v)}>
            <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Add tag" /></SelectTrigger>
            <SelectContent>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => void bulk("unsubscribe")}>
            Unsubscribe email
          </Button>
          <Button size="sm" variant="destructive" onClick={() => void bulk("delete")}>
            Delete
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="No contacts yet"
          description="Add people by email, mobile, or both — then send your first campaign."
          action={
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/contacts/import">Import CSV</Link>
              </Button>
              <Button variant="outline" onClick={() => setAddOpen(true)}>
                Add manually
              </Button>
              <Button asChild variant="ghost">
                <Link href="/forms">Signup form</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === contacts.length && contacts.length > 0}
                    onCheckedChange={(c) => {
                      setSelected(c ? new Set(contacts.map((x) => x.id)) : new Set());
                    }}
                  />
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email status</TableHead>
                <TableHead>Text status</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selected);
                        if (checked) next.add(c.id);
                        else next.delete(c.id);
                        setSelected(next);
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/contacts/${c.id}`} className="text-coral hover:underline">
                      {displayIdentity(c)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell>
                    {c.email ? <Badge variant="secondary">{c.status}</Badge> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {c.phoneE164 ? (
                      <Badge variant="secondary">{c.smsStatus || "NOT_PROVIDED"}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map(({ tag }) => (
                        <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {page} · {total.toLocaleString()} total
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page * 25 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
            <DialogDescription>
              Email only, mobile only, or both. Text consent is separate from email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email (optional if you add a mobile)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <Label>Mobile (optional if you add an email)</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="3125551212"
              />
            </div>
            {phone.trim() ? (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={smsConsent}
                  onCheckedChange={(v) => setSmsConsent(v === true)}
                />
                <span>
                  This person gave clear permission to receive marketing texts from my business.
                  Do not check this unless you have that consent.
                </span>
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void addContact()}>Add contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
