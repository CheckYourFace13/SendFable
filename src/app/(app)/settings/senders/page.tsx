import { requireWorkspaceContext, getWorkspaceOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { PageHeader } from "@/components/app/page-header";
import { SendersManager } from "./senders-manager";
import { platformSendDomain } from "@/lib/dmarc";

export const metadata = { title: "Sender identities" };

export default async function SendersPage() {
  const { workspace } = await requireWorkspaceContext();
  const owner = await getWorkspaceOwner(workspace.id);
  const identities = await prisma.senderIdentity.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Sender identities"
        description="Verified From addresses and authenticated domains for your campaigns."
      />
      <SendersManager
        initialIdentities={identities.map((i) => ({
          id: i.id,
          type: i.type,
          value: i.value,
          displayName: i.displayName,
          status: i.status,
          isDefault: i.isDefault,
          rewriteRequired: i.rewriteRequired,
          dkimTokens: (i.dkimTokens as string[] | null) ?? null,
        }))}
        customDomainsAllowed={PLANS[owner.plan].customDomains}
        platformDomain={platformSendDomain()}
      />
    </div>
  );
}
