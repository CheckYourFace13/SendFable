/**
 * Legacy path — redirect customers to the simplified Text Messaging setup.
 */

import { redirect, notFound } from "next/navigation";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import { requireWorkspaceContext } from "@/lib/session";
import { isOwnerPilotWorkspace } from "@/lib/sms/pilot";

export const dynamic = "force-dynamic";

export default async function SmsOnboardingRedirectPage() {
  if (!isSmsCodeEnabled()) notFound();
  const ctx = await requireWorkspaceContext();
  const ownerPilot = await isOwnerPilotWorkspace(ctx.workspace.id);
  if (!isSmsAccountSignupEnabled() && !ownerPilot) notFound();
  redirect("/settings/text-messaging");
}
