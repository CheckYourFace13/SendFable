/** Free-plan “Sent with SendFable” footer badge — conversion + attribution. */

export const REFERRAL_BADGE_URL =
  "https://sendfable.com/signup?utm_source=customer_email&utm_medium=footer_badge&utm_campaign=free_plan";

/** Preferred free-plan badge copy — SendFable product, never iScream Studio. */
export const REFERRAL_BADGE_LABEL_HTML =
  'Sent with <strong style="color:#E4572E;">SendFable</strong><br/><span style="font-size:10px;color:#9ca3af;">Turn website updates into ready-to-send emails</span>';

/** Alternate concise treatment (A/B via REFERRAL_BADGE_VARIANT). */
export const REFERRAL_BADGE_LABEL_ALT_HTML =
  'Sent with <strong style="color:#E4572E;">SendFable</strong><br/><span style="font-size:10px;color:#9ca3af;">Create emails like this free</span>';

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
