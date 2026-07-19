import { AlertTriangle } from "lucide-react";

/** Development-only notice when Redis is unset (inline campaign processing). */
export function RedisDevBanner() {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.REDIS_URL?.trim()) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">Development mode:</span> Redis is not configured.
        Campaigns process inline in this app process. Production requires Redis and the dedicated
        worker (<code className="rounded bg-amber-100 px-1">npm run worker</code>
        ). Local sends stay in console / <code className="rounded bg-amber-100 px-1">.eml</code>{" "}
        outbox when AWS keys are blank — not production delivery.
      </p>
    </div>
  );
}
