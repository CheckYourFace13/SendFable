/**
 * Customer SMS onboarding — SERVER gated. 404 while ACCOUNT_SIGNUP is off.
 * Full multi-step registration behind disabled flags (SF-019A).
 */

import { notFound } from "next/navigation";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import { requireWorkspaceContext } from "@/lib/session";
import { PageHeader } from "@/components/app/page-header";
import { SmsOnboardingClient } from "@/components/sms/onboarding-client";

export const dynamic = "force-dynamic";

export default async function SmsOnboardingPage() {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled()) notFound();
  await requireWorkspaceContext();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Text messaging registration"
        description="Complete carrier registration details. Nothing is submitted to carriers until SendFable reviews and you approve activation."
      />
      <SmsOnboardingClient />
    </div>
  );
}
