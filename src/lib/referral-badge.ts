/** Promotional footer. The customer stays the brand; this line sits underneath. */

export const REFERRAL_BADGE_URL =
  "https://sendfable.com/signup?utm_source=customer_email&utm_medium=footer_badge&utm_campaign=free_plan";

/** Preferred footer — SendFable product, never iScream Studio. */
export const REFERRAL_BADGE_LABEL_HTML =
  'Powered by <strong style="color:#E4572E;">SendFable</strong><br/><span style="font-size:10px;color:#9ca3af;">We turn your content into emails ready to send.</span>';

/** Same promise if a badge variant is set. Do not restore the older “Sent with” line. */
export const REFERRAL_BADGE_LABEL_ALT_HTML = REFERRAL_BADGE_LABEL_HTML;

export function referralBadgeLabelHtml(): string {
  const v = (process.env.REFERRAL_BADGE_VARIANT || "a").toLowerCase();
  return v === "b" || v === "alt" ? REFERRAL_BADGE_LABEL_ALT_HTML : REFERRAL_BADGE_LABEL_HTML;
}

export function isReferralBadgeLanding(searchParams: URLSearchParams): boolean {
  const medium = searchParams.get("utm_medium");
  const source = searchParams.get("utm_source");
  if (medium !== "footer_badge") return false;
  // Accept legacy utm_source=email and current customer_email
  return source === "customer_email" || source === "email";
}
