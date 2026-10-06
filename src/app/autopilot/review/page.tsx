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

  if ("error" in loaded && loaded.error && !("draft" in loaded && loaded.draft)) {
    const messages: Record<string, string> = {
      invalid_token: "This link is invalid or expired.",
      not_found: "This campaign draft could not be found.",
      token_used: "This link was already used.",
      expired: "This draft expired. Nothing was sent.",
      already_decided: "This draft was already decided. Nothing else will send from this link.",
    };
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-ink">Unable to continue</h1>
        <p className="mt-2 text-sm text-ink/65">
          {messages[loaded.error] || "Something went wrong."}
        </p>
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
  const recipients = loaded.recipients ?? 0;
  const titles = {
    approve: "Ready to send this campaign?",
    reject: "Do not send this campaign?",
    edit: "Edit this campaign before sending?",
  } as const;

  return (
    <Shell>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
        Marketing Autopilot
      </p>
      <h1 className="mt-2 text-xl font-semibold text-ink">{titles[action]}</h1>

      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="text-ink/50">What changed</dt>
          <dd className="mt-0.5 text-ink">{draft.explanation || draft.changeSummary}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Subject</dt>
          <dd className="mt-0.5 font-medium text-ink">{draft.subject}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Audience</dt>
          <dd className="mt-0.5 text-ink">
            {recipients.toLocaleString()} estimated recipient{recipients === 1 ? "" : "s"}
          </dd>
        </div>
      </dl>

      {action === "approve" && (
        <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Ready to send this campaign to {recipients.toLocaleString()} customers?
        </p>
      )}
      {action === "reject" && (
        <p className="mt-6 rounded-lg border border-ink/10 bg-parchment px-4 py-3 text-sm text-ink/80">
          Confirm you do not want to send this campaign. Nothing will go out.
        </p>
      )}
      {action === "edit" && (
        <p className="mt-6 rounded-lg border border-ink/10 bg-parchment px-4 py-3 text-sm text-ink/80">
          Continue to the SendFable editor to change subject, content, template, or audience —
          then send with the normal review flow.
        </p>
      )}

      <AutopilotConfirmForm token={token} action={action} />

      <p className="mt-8 text-xs text-ink/45">
        Opening this page does not send anything. Only the confirmation button below performs
        the action. No response always means no send.
      </p>
    </Shell>
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
