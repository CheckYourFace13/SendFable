/** Free-plan “Sent with SendFable” footer badge — conversion + attribution. */
export const REFERRAL_BADGE_URL =
  "https://sendfable.com/signup?utm_source=email&utm_medium=footer_badge&utm_campaign=free_plan";

export const REFERRAL_BADGE_LABEL_HTML =
  'Sent with <strong style="color:#E4572E;">SendFable</strong>';

export function isReferralBadgeLanding(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get("utm_source") === "email" &&
    searchParams.get("utm_medium") === "footer_badge"
  );
}
