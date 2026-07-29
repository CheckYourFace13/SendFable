import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  const ctx = await requirePlatformAdmin();
  if (!ctx) redirect("/dashboard");

  const apps = await prisma.partnerApplication.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partner applications"
        description="Review queue only. No outreach is sent from this screen."
      />
      <ul className="space-y-3 rounded-xl border bg-white p-5 text-sm">
        {apps.length === 0 && <li className="text-muted-foreground">No applications yet.</li>}
        {apps.map((a) => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 border-b py-3 last:border-0">
            <div>
              <div className="font-medium">
                {a.name} · {a.email}
              </div>
              <div className="text-muted-foreground">
                {a.partnerType}
                {a.company ? ` · ${a.company}` : ""}
                {a.website ? ` · ${a.website}` : ""}
              </div>
              {a.audienceNote && <p className="mt-1 text-xs">{a.audienceNote}</p>}
            </div>
            <Badge variant="secondary">{a.status}</Badge>
          </li>
        ))}
      </ul>
      <Link className="text-sm text-coral underline" href="/admin">
        Back to admin
      </Link>
    </div>
  );
}
