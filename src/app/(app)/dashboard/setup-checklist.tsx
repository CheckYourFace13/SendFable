import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

export type SetupItem = {
  id: string;
  label: string;
  href: string;
  done: boolean;
  hint?: string;
};

export function SetupChecklist({ items }: { items: SetupItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  return (
    <div className="mt-10 rounded-2xl border bg-white p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Setup checklist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Finish these before your first real send. {doneCount}/{items.length} complete.
          </p>
        </div>
      </div>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-lg border border-transparent px-2 py-2 transition hover:border-ink/10 hover:bg-parchment/50"
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-teal" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-ink/30" aria-hidden />
              )}
              <div>
                <div className={`text-sm font-medium ${item.done ? "text-ink/60 line-through" : ""}`}>
                  {item.label}
                </div>
                {item.hint && !item.done && (
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
