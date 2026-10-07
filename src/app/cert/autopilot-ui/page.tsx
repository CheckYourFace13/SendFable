import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Autopilot UI fixtures (cert)",
};

/** Controlled noindex UI fixtures for product screenshots — no real customer PII. */
export default function AutopilotUiFixturesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const raw = searchParams?.view;
  const view = (Array.isArray(raw) ? raw[0] : raw) || "setup";

  return (
    <div className="min-h-screen bg-[#f7f3eb] px-4 py-10 text-[#1a1a1a]">
      <div className="mx-auto max-w-xl">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-[#0f766e]">
          SendFable · Marketing Autopilot (controlled demo data)
        </p>
        <div id="autopilot-shot">
          {view === "setup" && <SetupView />}
          {view === "detected" && <DetectedView />}
          {view === "draft" && <DraftView />}
          {view === "email" && <EmailView />}
          {view === "confirm" && <ConfirmView />}
          {view === "result" && <ResultView />}
        </div>
        <nav className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-[#6b7280]">
          {["setup", "detected", "draft", "email", "confirm", "result"].map((v) => (
            <Link key={v} className="underline" href={`/cert/autopilot-ui?view=${v}`}>
              {v}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">{children}</div>
  );
}

function SetupView() {
  return (
    <Card>
      <h1 className="text-xl font-semibold">Marketing Autopilot</h1>
      <p className="mt-1 text-sm text-black/60">
        Your website changes. SendFable turns it into a campaign. You approve it.
      </p>
      <ol className="mt-6 space-y-4 text-sm">
        <li>
          <p className="text-xs font-semibold uppercase text-black/45">Step 1</p>
          <p className="font-medium">What page should SendFable watch?</p>
          <div className="mt-1 rounded-md border bg-[#f8fafc] px-3 py-2">
            https://demo.cafe/specials
          </div>
        </li>
        <li>
          <p className="text-xs font-semibold uppercase text-black/45">Step 2</p>
          <p className="font-medium">Who should receive these campaigns?</p>
          <div className="mt-1 rounded-md border bg-[#f8fafc] px-3 py-2">Everyone subscribed</div>
        </li>
        <li>
          <p className="text-xs font-semibold uppercase text-black/45">Step 3</p>
          <p className="font-medium">How often should we check?</p>
          <div className="mt-1 rounded-md border bg-[#f8fafc] px-3 py-2">Daily</div>
        </li>
      </ol>
      <button
        type="button"
        className="mt-6 w-full rounded-lg bg-[#e11d48] px-4 py-3 text-sm font-semibold text-white"
      >
        Turn on Marketing Autopilot
      </button>
    </Card>
  );
}

function DetectedView() {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-[#0f766e]">Change detected</p>
      <h1 className="mt-2 text-xl font-semibold">New Fall Special</h1>
      <p className="mt-2 text-sm text-black/65">
        Watched page: demo.cafe/specials · Detected today
      </p>
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
        Meaningful marketing change: new special with price and offer details from the page.
      </div>
    </Card>
  );
}

function DraftView() {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-black/45">Campaign draft</p>
      <h1 className="mt-2 text-xl font-semibold">New Fall Special this week</h1>
      <p className="mt-1 text-sm text-black/55">Preheader: $12 lunch plate, all week</p>
      <div className="mt-4 rounded-lg border bg-[#f8fafc] p-4 text-sm leading-relaxed">
        <p>Hi there,</p>
        <p className="mt-2">New Fall Special: $12 lunch plate all week. Dine in or takeout.</p>
        <p className="mt-2">See the full update on our site.</p>
        <div className="mt-4 inline-block rounded-md bg-[#4f46e5] px-4 py-2 text-xs font-semibold text-white">
          See the offer
        </div>
      </div>
    </Card>
  );
}

function EmailView() {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-center text-lg font-bold">
          Send<span className="text-[#4f46e5]">fable</span>
        </p>
        <h1 className="mt-6 text-lg font-semibold">Your next campaign is ready to review</h1>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-black/45">What changed</dt>
            <dd>New Fall Special detected on your specials page</dd>
          </div>
          <div>
            <dt className="text-black/45">Campaign subject</dt>
            <dd className="font-medium">New Fall Special this week</dd>
          </div>
          <div>
            <dt className="text-black/45">Audience</dt>
            <dd>Everyone subscribed · 1 estimated recipient</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
            Approve & send
          </span>
          <span className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
            Edit before sending
          </span>
          <span className="rounded-md bg-slate-600 px-3 py-2 text-xs font-semibold text-white">
            Do not send
          </span>
        </div>
        <p className="mt-4 text-xs text-black/45">Opening a link does not send the campaign.</p>
      </div>
    </div>
  );
}

function ConfirmView() {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-black/45">Marketing Autopilot</p>
      <h1 className="mt-2 text-xl font-semibold">Ready to send this campaign?</h1>
      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="text-black/45">What changed</dt>
          <dd>New Fall Special detected</dd>
        </div>
        <div>
          <dt className="text-black/45">Subject</dt>
          <dd className="font-medium">New Fall Special this week</dd>
        </div>
        <div>
          <dt className="text-black/45">Audience</dt>
          <dd>1 estimated recipient</dd>
        </div>
      </dl>
      <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Ready to send this campaign to 1 customer?
      </p>
      <button
        type="button"
        className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
      >
        Approve & send now
      </button>
      <p className="mt-4 text-xs text-black/45">
        Opening this page does not send anything. Only the confirmation button performs the action.
      </p>
    </Card>
  );
}

function ResultView() {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-emerald-700">Campaign sent</p>
      <h1 className="mt-2 text-xl font-semibold">New Fall Special this week</h1>
      <ul className="mt-4 space-y-2 text-sm text-black/70">
        <li>Recipients: 1</li>
        <li>Delivered: 1</li>
        <li>Opens: —</li>
        <li>Status: Completed</li>
      </ul>
      <p className="mt-4 text-xs text-black/45">Demo numbers only. No customer details.</p>
    </Card>
  );
}
