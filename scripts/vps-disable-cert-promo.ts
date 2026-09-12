/**
 * Deactivate cert promotion codes / delete unused cert coupons.
 * Usage: npx tsx scripts/vps-disable-cert-promo.ts promo_xxx [promo_yyy...]
 */
import { getStripe, isStripeEnabled } from "../src/lib/stripe";

async function main() {
  if (!isStripeEnabled()) throw new Error("stripe disabled");
  const stripe = getStripe()!;
  const ids = process.argv.slice(2).filter((a) => a.startsWith("promo_"));
  if (!ids.length) throw new Error("pass promo_ ids");
  for (const id of ids) {
    const updated = await stripe.promotionCodes.update(id, { active: false });
    console.log(JSON.stringify({ id: updated.id, code: updated.code, active: updated.active }));
  }
  // Also try delete leftover once-coupons by id args coupon=
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("coupon=")) {
      const cid = a.slice("coupon=".length);
      const del = await stripe.coupons.del(cid);
      console.log(JSON.stringify({ deletedCoupon: del.id, deleted: del.deleted }));
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
