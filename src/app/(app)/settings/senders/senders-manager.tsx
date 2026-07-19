"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AtSign,
  BadgeCheck,
  Copy,
  Globe,
  Info,
  MailPlus,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/page-header";

export interface IdentityRow {
  id: string;
  type: "ADDRESS" | "DOMAIN";
  value: string;
  displayName: string | null;
  status: "PENDING" | "VERIFIED" | "FAILED";
  isDefault: boolean;
  rewriteRequired: boolean;
  dkimTokens: string[] | null;
}

function StatusBadge({ status }: { status: IdentityRow["status"] }) {
  if (status === "VERIFIED") return <Badge variant="success">Verified</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="warning">Pending</Badge>;
}

function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

export function SendersManager({
  initialIdentities,
  customDomainsAllowed,
  platformDomain,
}: {
  initialIdentities: IdentityRow[];
  customDomainsAllowed: boolean;
  platformDomain: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [rewriteNotice, setRewriteNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ADDRESS", email, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't add address");
        return;
      }
      if (data.rewriteRequired) {
        const local = email.split("@")[0];
        setRewriteNotice(
          `We'll send as ${local}@${platformDomain} with replies going to your real address — this keeps your emails out of spam.`
        );
      } else {
        setRewriteNotice(null);
      }
      if (data.autoVerified) {
        toast.success("Address verified automatically — its domain is already authenticated.");
      } else {
        toast.success(`Verification email sent to ${email}. Click the link inside to finish.`);
      }
      setEmail("");
      setDisplayName("");
      if (!data.rewriteRequired) setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DOMAIN", domain }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't add domain");
        return;
      }
      toast.success("Domain added. Publish the DNS records below, then check DNS.");
      setDomain("");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function checkDns(id: string) {
    setChecking(id);
    try {
      const res = await fetch(`/api/identities/${id}/check-dns`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Check failed");
        return;
      }
      if (data.status === "VERIFIED") toast.success("Domain verified! 🎉 Full DKIM alignment is active.");
      else if (data.status === "FAILED") toast.error("Verification failed — double-check the CNAME records.");
      else toast.info("Not verified yet. DNS changes can take up to 48 hours to propagate.");
      router.refresh();
    } finally {
      setChecking(null);
    }
  }

  async function makeDefault(id: string) {
    const res = await fetch(`/api/identities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      toast.success("Default sender updated");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Couldn't update");
    }
  }

  async function resend(id: string, value: string) {
    const res = await fetch(`/api/identities/${id}/resend`, { method: "POST" });
    if (res.ok) toast.success(`Verification email re-sent to ${value}`);
    else toast.error("Couldn't resend — try again shortly");
  }

  async function remove(id: string) {
    const res = await fetch(`/api/identities/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Identity removed");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Couldn't remove");
    }
  }

  const addresses = initialIdentities.filter((i) => i.type === "ADDRESS");
  const domains = initialIdentities.filter((i) => i.type === "DOMAIN");

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setRewriteNotice(null); }}>
          <DialogTrigger asChild>
            <Button><MailPlus /> Add sender</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a sender</DialogTitle>
              <DialogDescription>
                Verify a From address, or authenticate a whole domain (Growth+).
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="address">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="address"><AtSign className="mr-1.5 h-3.5 w-3.5" /> Address</TabsTrigger>
                <TabsTrigger value="domain"><Globe className="mr-1.5 h-3.5 w-3.5" /> Domain</TabsTrigger>
              </TabsList>
              <TabsContent value="address">
                {rewriteNotice ? (
                  <div className="space-y-4 py-2">
                    <div className="flex gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{rewriteNotice}</p>
                    </div>
                    <Button className="w-full" onClick={() => { setOpen(false); setRewriteNotice(null); }}>
                      Got it
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={addAddress} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="sender-name">Display name</Label>
                      <Input id="sender-name" required maxLength={80} value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane at Acme" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sender-email">From address</Label>
                      <Input id="sender-email" type="email" required value={email}
                        onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" />
                      <p className="text-xs text-muted-foreground">
                        Any address works — we&apos;ll email it a verification link.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" loading={loading}>
                      Send verification email
                    </Button>
                  </form>
                )}
              </TabsContent>
              <TabsContent value="domain">
                {customDomainsAllowed ? (
                  <form onSubmit={addDomain} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="sender-domain">Domain</Label>
                      <Input id="sender-domain" required value={domain}
                        onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
                      <p className="text-xs text-muted-foreground">
                        We&apos;ll give you 3 CNAME records. Once published, every address
                        @{domain || "your-domain"} sends with full DKIM alignment.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" loading={loading}>
                      Add domain
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4 py-4 text-center">
                    <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Custom domain authentication (DKIM for your own domain) is available on
                      <strong> Growth</strong> and <strong>Pro</strong> plans.
                    </p>
                    <Button asChild variant="outline"><a href="/billing">See plans</a></Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {initialIdentities.length === 0 && (
        <EmptyState
          icon={<AtSign />}
          title="No senders yet"
          description="Add and verify the From address you want your campaigns to come from. Any email address works."
        />
      )}

      {addresses.length > 0 && (
        <Card>
          <CardContent className="divide-y p-0">
            {addresses.map((idn) => (
              <div key={idn.id} className="flex items-center gap-3 px-5 py-4">
                <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {idn.displayName ? `${idn.displayName} <${idn.value}>` : idn.value}
                    </span>
                    <StatusBadge status={idn.status} />
                    {idn.isDefault && (
                      <Badge variant="secondary"><Star className="mr-1 h-3 w-3" /> Default</Badge>
                    )}
                  </div>
                  {idn.rewriteRequired && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Sends as {idn.value.split("@")[0]}@{platformDomain} · replies go to {idn.value}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {idn.status === "VERIFIED" && !idn.isDefault && (
                      <DropdownMenuItem onClick={() => makeDefault(idn.id)}>
                        <BadgeCheck /> Make default
                      </DropdownMenuItem>
                    )}
                    {idn.status === "PENDING" && (
                      <DropdownMenuItem onClick={() => resend(idn.id, idn.value)}>
                        <RefreshCw /> Resend verification
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600" onClick={() => remove(idn.id)}>
                      <Trash2 /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {domains.map((idn) => (
        <Card key={idn.id}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium">{idn.value}</span>
              <StatusBadge status={idn.status} />
              <div className="ml-auto flex items-center gap-2">
                {idn.status !== "VERIFIED" && (
                  <Button size="sm" variant="outline" loading={checking === idn.id}
                    onClick={() => checkDns(idn.id)}>
                    <RefreshCw /> Check DNS
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(idn.id)}>
                  <Trash2 />
                </Button>
              </div>
            </div>

            {idn.status !== "VERIFIED" && idn.dkimTokens && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Add these 3 CNAME records at your DNS provider, then click &quot;Check DNS&quot;.
                  Propagation can take minutes to 48 hours.
                </p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Host / Name</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Value</th>
                        <th className="w-10 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono">
                      {idn.dkimTokens.map((t) => (
                        <tr key={t}>
                          <td className="px-3 py-2">{t}._domainkey.{idn.value}</td>
                          <td className="px-3 py-2">CNAME</td>
                          <td className="px-3 py-2">{t}.dkim.amazonses.com</td>
                          <td className="px-2 py-2">
                            <button
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => copy(`${t}._domainkey.${idn.value} CNAME ${t}.dkim.amazonses.com`)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {idn.status === "VERIFIED" && (
              <p className="mt-3 text-xs text-muted-foreground">
                ✓ Any From address @{idn.value} now sends with full DKIM alignment — no per-address
                verification needed.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
