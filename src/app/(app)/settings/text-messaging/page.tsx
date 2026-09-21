/**
 * Customer Text Messaging setup — simple SendFable UX (no provider branding).
 * Gated: SMS code + (account signup OR owner pilot workspace).
 */

import { notFound } from "next/navigation";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import { requireWorkspaceContext } from "@/lib/session";
import { isSmsControlledAccessWorkspace } from "@/lib/sms/pilot";
import { PageHeader } from "@/components/app/page-header";
import { TextMessagingSetupClient } from "@/components/sms/text-messaging-setup-client";

export const dynamic = "force-dynamic";

export default async function SettingsTextMessagingPage() {
  if (!isSmsCodeEnabled()) notFound();
  const ctx = await requireWorkspaceContext();
  const controlled = await isSmsControlledAccessWorkspace(ctx.workspace.id);
  if (!isSmsAccountSignupEnabled() && !controlled) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Text messaging setup"
        description="Turn on texts for people who opt in. We’ll handle the approval details for you."
      />
      <TextMessagingSetupClient />
    </div>
  );
}
