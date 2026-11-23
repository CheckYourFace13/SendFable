import Link from "next/link";
import { isText20CheckoutConfigured, isText20Public } from "@/lib/text20";

export { isText20CheckoutConfigured, isText20Public } from "@/lib/text20";

/** One quiet line. No countdown, no "limited time". Email plans only. */
export function Text20Hint() {
  if (!isText20Public()) return null;
  const autoApply = isText20CheckoutConfigured();
  return (
    <p className="mt-3 text-sm text-ink/70">
      New paid customers:{" "}
      <Link href="/promo/text20" className="font-medium text-coral underline-offset-2 hover:underline">
        20% off your first 3 months on monthly Starter or Growth with TEXT20
      </Link>
      {autoApply ? "." : ". Enter TEXT20 at checkout if it is not applied automatically."}
    </p>
  );
}
