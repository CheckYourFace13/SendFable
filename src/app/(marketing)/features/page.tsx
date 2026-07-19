export const metadata = { title: "Features" };

const SECTIONS = [
  {
    title: "Any-email signup",
    body: "Password or magic link. No Google or Microsoft account required — ever.",
  },
  {
    title: "Sender identities",
    body: "Verify any From address. Strict-DMARC providers get a friendly From-rewrite so mail lands.",
  },
  {
    title: "Audience tools",
    body: "CSV import with mapping, tags, visual segments, hosted signup forms, and double opt-in.",
  },
  {
    title: "Drag-and-drop builder",
    body: "Blocks for heading, text, image, button, columns, social, and a mandatory compliant footer.",
  },
  {
    title: "Campaign engine",
    body: "BullMQ + SES with ramp limits, pause/resume, merge tags, and RFC 8058 one-click unsubscribe.",
  },
  {
    title: "Analytics",
    body: "Opens, clicks, bounces, complaints, link performance, and account health thresholds.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Features</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Everything you need to grow a list and send campaigns that feel personal.
      </p>
      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
