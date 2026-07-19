import { isEarlyLaunch, externalEmailActive, stripeBillingActive } from "@/lib/early-launch";

export function EarlyLaunchBanner() {
  if (!isEarlyLaunch()) return null;

  const parts: string[] = [];
  if (!externalEmailActive()) parts.push("SES delivery not activated (local .eml only)");
  if (!stripeBillingActive()) parts.push("Stripe billing unavailable");

  return (
    <div
      role="status"
      className="border-b border-amber-300/80 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
    >
      <span className="font-semibold">Early launch:</span>{" "}
      {parts.length ? parts.join(" · ") : "Limited production mode"}. Real customer campaigns and
      paid checkout stay off until you enable them.
    </div>
  );
}
