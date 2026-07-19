"use client";

export function BuilderMock() {
  return (
    <div className="relative mx-auto w-full max-w-3xl animate-fade-up overflow-hidden rounded-2xl border bg-white shadow-xl shadow-indigo-100/50">
      <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 text-xs text-muted-foreground">Campaign builder</span>
      </div>
      <div className="grid grid-cols-[140px_1fr_160px]">
        <aside className="space-y-2 border-r p-3 text-xs">
          {["Heading", "Text", "Image", "Button", "Divider"].map((b, i) => (
            <div
              key={b}
              className="rounded-md border bg-slate-50 px-2 py-2 transition-transform"
              style={{
                animation: `fade-up 0.5s ease-out ${i * 0.08}s both`,
              }}
            >
              {b}
            </div>
          ))}
        </aside>
        <div className="space-y-3 bg-slate-100 p-6">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div
              className="text-xl font-bold"
              style={{ animation: "fade-up 0.6s ease-out 0.2s both" }}
            >
              Hey {"{{first_name|there}}"},
            </div>
            <p
              className="mt-2 text-sm text-slate-600"
              style={{ animation: "fade-up 0.6s ease-out 0.35s both" }}
            >
              Your story, personalized at scale — without looking like a blast.
            </p>
            <div
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
              style={{ animation: "fade-up 0.6s ease-out 0.5s both" }}
            >
              Read the update
            </div>
          </div>
        </div>
        <aside className="space-y-3 border-l p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Properties</div>
          <div className="rounded border bg-slate-50 p-2">Merge tag inserted</div>
          <div className="rounded border bg-slate-50 p-2">Button → indigo</div>
        </aside>
      </div>
    </div>
  );
}
