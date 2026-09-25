import Link from "next/link";
import { isSmsPublicEnabled } from "@/lib/sms/flags";

/** TEXT20 is public only when SMS is public and the promo flag is on. */
export function isText20Public(): boolean {
  return (
    isSmsPublicEnabled() &&
    (process.env.SENDFABLE_PROMO_TEXT20_PUBLIC === "true" ||
      process.env.SENDFABLE_PROMO_TEXT20_PUBLIC === "1")
  );
}

/** One quiet line. No countdown, no "limited time". */
export function Text20Hint() {
  if (!isText20Public()) return null;
  return (
    <p className="mt-3 text-sm text-ink/70">
      Try Email + Text together.{" "}
      <Link href="/promo/text20" className="font-medium text-coral underline-offset-2 hover:underline">
        20% off your first 3 months with TEXT20
      </Link>
      .
    </p>
  );
}
