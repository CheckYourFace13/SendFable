/** Free-plan “Sent with SendFable” footer badge — conversion + attribution. */
export const REFERRAL_BADGE_URL =
  "https://sendfable.com/signup?utm_source=email&utm_medium=footer_badge&utm_campaign=free_plan";

/** Preferred free-plan badge copy (HTML safe for email footer). */
export const REFERRAL_BADGE_LABEL_HTML =
  'Sent with <strong style="color:#E4572E;">SendFable</strong><br/><span style="font-size:10px;color:#9ca3af;">Simple email marketing by iScream Studio</span>';

export function isReferralBadgeLanding(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get("utm_source") === "email" &&
    searchParams.get("utm_medium") === "footer_badge"
  );
}
