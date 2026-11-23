import { isSmsPublicEnabled } from "@/lib/sms/flags";
import { stripePromotionIdForCode } from "@/lib/plan-checkout-intent";

/** TEXT20 is public only when SMS is public and the promo flag is on. */
export function isText20Public(): boolean {
  return (
    isSmsPublicEnabled() &&
    (process.env.SENDFABLE_PROMO_TEXT20_PUBLIC === "true" ||
      process.env.SENDFABLE_PROMO_TEXT20_PUBLIC === "1")
  );
}

/** True when checkout can actually attach the Stripe promotion. */
export function isText20CheckoutConfigured(): boolean {
  return Boolean(stripePromotionIdForCode("TEXT20"));
}
