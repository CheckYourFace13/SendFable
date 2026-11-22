import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SetupItem = {
  id: string;
  label: string;
  href: string;
  done: boolean;
  hint?: string;
};

export function SetupChecklist({
  items,
  title = "Get ready to send",
  subtitle,
  continueHref,
  continueLabel = "Continue",
}: {
  items: SetupItem[];
  title?: string;
  subtitle?: string;
  continueHref?: string;
  continueLabel?: string;
}) {
  const doneCount = items.filter((i) => i.done).length;
  const next = items.find((i) => !i.done);
  const href = continueHref ?? next?.href;

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {subtitle ??
              `Finish these in any order. ${doneCount}/${items.length} complete.`}
          </p>
        </div>
      </div>
      <ul className="mt-5 space-y-3" aria-label="Activation checklist">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition hover:border-coral/30 ${
                item.done ? "border-emerald-200 bg-emerald-50/50" : "border-transparent hover:bg-parchment/50"
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink/30" aria-hidden />
              )}
              <div>
                <div
                  className={`text-sm font-medium ${item.done ? "text-ink/60 line-through" : ""}`}
                >
                  {item.label}
                </div>
                {item.hint && !item.done ? (
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                ) : null}
                <span className="sr-only">{item.done ? "Completed" : "Not completed"}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {href ? (
        <div className="mt-6">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={href}>{continueLabel}</Link>
          </Button>
          {next ? (
            <p className="mt-2 text-xs text-muted-foreground">Next: {next.label}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
