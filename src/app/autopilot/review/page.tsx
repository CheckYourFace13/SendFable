import Link from "next/link";
import { loadAutopilotReview } from "@/lib/autopilot/approval";
import { AutopilotConfirmForm } from "./confirm-form";

export const dynamic = "force-dynamic";

export default async function AutopilotReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }> | { t?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const token = sp.t?.trim() || "";

  if (!token) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-ink">Link missing</h1>
        <p className="mt-2 text-sm text-ink/65">
          Open the button from your SendFable approval email.
        </p>
      </Shell>
    );
  }

  const loaded = await loadAutopilotReview(token);

  if ("error" in loaded && loaded.error === "invalid_token") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-ink">Unable to continue</h1>
        <p className="mt-2 text-sm text-ink/65">
          This link is invalid or expired. Nothing was sent. The draft stays waiting in
          SendFable if you have not decided yet.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-coral underline">
            Sign in to SendFable
          </Link>
        </p>
      </Shell>
    );
  }

  if ("error" in loaded && loaded.error === "not_found") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-ink">Unable to continue</h1>
        <p className="mt-2 text-sm text-ink/65">This campaign draft could not be found.</p>
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-coral underline">
            Sign in to SendFable
          </Link>
        </p>
      </Shell>
    );
  }

  if (!("draft" in loaded) || !loaded.draft) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-ink">Unable to continue</h1>
      </Shell>
    );
  }

  const { draft, action } = loaded;
  const outcome = "outcome" in loaded ? loaded.outcome : "open";
  const scheduledLabel =
    "scheduledLabel" in loaded && loaded.scheduledLabel ? loaded.scheduledLabel : null;
  const defaultTimezone =
    "defaultTimezone" in loaded && loaded.defaultTimezone
      ? loaded.defaultTimezone
      : draft.workspace?.timezone || "UTC";

  if (outcome === "sent") {
    return (
      <Shell>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Scribe</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Campaign sent</h1>
        <p className="mt-2 text-sm text-ink/65">
          This campaign already sent. Reopening the review link does not send again.
        </p>
        <SubjectBlock subject={draft.subject} />
        <SignInLink />
      </Shell>
    );
  }

  if (outcome === "scheduled") {
    return (
      <Shell>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Scribe</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Campaign scheduled</h1>
        <p className="mt-2 text-sm text-ink/65">
          {scheduledLabel
            ? `Campaign scheduled for: ${scheduledLabel}`
            : "This campaign is already scheduled. Nothing else will send from this link."}
        </p>
        {draft.scheduleTimezone ? (
          <p className="mt-2 text-sm text-ink/65">Timezone: {draft.scheduleTimezone}</p>
        ) : null}
        <SubjectBlock subject={draft.subject} />
        <SignInLink />
      </Shell>
    );
  }

  if (outcome === "rejected") {
    return (
      <Shell>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Scribe</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Campaign skipped</h1>
        <p className="mt-2 text-sm text-ink/65">
          This draft was skipped. It will not send from this link.
        </p>
        <SignInLink />
      </Shell>
    );
  }

  if (outcome === "editing") {
    return (
      <Shell>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Scribe</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Opened for editing</h1>
        <p className="mt-2 text-sm text-ink/65">
          This draft was moved to the editor. Sign in to finish changes, then schedule from
          SendFable.
        </p>
        <SignInLink />
      </Shell>
    );
  }

  if (outcome === "decided") {
    return (
      <Shell>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Scribe</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Already decided</h1>
        <p className="mt-2 text-sm text-ink/65">
          This draft was already decided. Nothing else will send from this link.
        </p>
        <SignInLink />
      </Shell>
    );
  }

  const recipients = "recipients" in loaded ? loaded.recipients ?? 0 : 0;
  const audienceLabel =
    "audienceLabel" in loaded && loaded.audienceLabel
      ? loaded.audienceLabel
      : "Everyone subscribed";
  const titles = {
    approve: "Choose when this campaign sends",
    reject: "Skip this campaign?",
    edit: "Edit this campaign before sending?",
    send: "Send this campaign now?",
  } as const;

  return (
    <Shell>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Scribe</p>
      <h1 className="mt-2 text-xl font-semibold text-ink">{titles[action]}</h1>

      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="text-ink/50">Subject</dt>
          <dd className="mt-0.5 font-medium text-ink">{draft.subject}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Audience</dt>
          <dd className="mt-0.5 text-ink">{audienceLabel}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Estimated recipients</dt>
          <dd className="mt-0.5 text-ink">{recipients.toLocaleString()}</dd>
        </div>
        {action === "approve" ? (
          <div>
            <dt className="text-ink/50">Timezone default</dt>
            <dd className="mt-0.5 text-ink">{defaultTimezone}</dd>
          </div>
        ) : null}
      </dl>

      {action === "approve" && (
        <p className="mt-6 rounded-lg border border-ink/10 bg-parchment px-4 py-3 text-sm text-ink/80">
          Nothing sends until you confirm. Choose SEND NOW or schedule a date, time, and timezone.
        </p>
      )}
      {action === "send" && (
        <p className="mt-6 rounded-lg border border-ink/10 bg-parchment px-4 py-3 text-sm text-ink/80">
          Opening this link did not send the campaign. Confirm with SEND NOW only if you want to
          send immediately.
        </p>
      )}
      {action === "reject" && (
        <p className="mt-6 rounded-lg border border-ink/10 bg-parchment px-4 py-3 text-sm text-ink/80">
          Skip this campaign. It will not send. Your other drafts stay where they are.
        </p>
      )}
      {action === "edit" && (
        <p className="mt-6 rounded-lg border border-ink/10 bg-parchment px-4 py-3 text-sm text-ink/80">
          Continue to the SendFable editor to change subject, content, template, or audience —
          then send with the normal review flow.
        </p>
      )}

      <AutopilotConfirmForm
        token={token}
        action={action}
        audience={audienceLabel}
        recipientCount={recipients}
        defaultTimezone={defaultTimezone}
        subject={draft.subject || ""}
      />

      <p className="mt-8 text-xs text-ink/45">
        Opening this page does not send anything. Only the confirmation button below performs
        the action. If you do nothing, nothing sends, and the draft stays waiting for you.
      </p>
    </Shell>
  );
}

function SubjectBlock({ subject }: { subject: string | null }) {
  if (!subject) return null;
  return (
    <dl className="mt-6 space-y-3 text-sm">
      <div>
        <dt className="text-ink/50">Subject</dt>
        <dd className="mt-0.5 font-medium text-ink">{subject}</dd>
      </div>
    </dl>
  );
}

function SignInLink() {
  return (
    <p className="mt-6 text-sm">
      <Link href="/login" className="text-coral underline">
        Sign in to SendFable
      </Link>
    </p>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center text-lg font-bold tracking-tight text-ink">
          Send<span className="text-[#4F46E5]">fable</span>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
