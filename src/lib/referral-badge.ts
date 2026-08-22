/** Footer badge link for Free-plan campaigns — UTM-tagged for attribution. */
export const REFERRAL_BADGE_URL =
  "https://sendfable.com/?utm_source=email&utm_medium=footer_badge&utm_campaign=free_plan";

export function isReferralBadgeLanding(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get("utm_source") === "email" &&
    searchParams.get("utm_medium") === "footer_badge"
  );
}
