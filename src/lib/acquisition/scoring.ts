export type ScoreSignals = {
  newsletterPresent?: boolean;
  eventsPromotionsPresent?: boolean;
  repeatCustomerBusiness?: boolean;
  publicBusinessEmail?: boolean;
  activeWebsite?: boolean;
  competitorEmailTool?: boolean;
  clearLocalSmallBusiness?: boolean;
  recentSiteActivity?: boolean;
  poorOrDeadSite?: boolean;
  questionableFit?: boolean;
  duplicateOrContacted?: boolean;
  unsubscribedOrComplaintOrCustomer?: boolean;
};

export const SCORE_WEIGHTS = {
  newsletterPresent: 25,
  eventsPromotionsPresent: 15,
  repeatCustomerBusiness: 15,
  publicBusinessEmail: 10,
  activeWebsite: 10,
  competitorEmailTool: 10,
  clearLocalSmallBusiness: 10,
  recentSiteActivity: 5,
  poorOrDeadSite: -30,
  questionableFit: -30,
  duplicateOrContacted: -50,
  unsubscribedOrComplaintOrCustomer: -100,
} as const;

/** Pure 0–100 score (clamped). */
export function scoreProspect(signals: ScoreSignals): number {
  let s = 0;
  if (signals.newsletterPresent) s += SCORE_WEIGHTS.newsletterPresent;
  if (signals.eventsPromotionsPresent) s += SCORE_WEIGHTS.eventsPromotionsPresent;
  if (signals.repeatCustomerBusiness) s += SCORE_WEIGHTS.repeatCustomerBusiness;
  if (signals.publicBusinessEmail) s += SCORE_WEIGHTS.publicBusinessEmail;
  if (signals.activeWebsite) s += SCORE_WEIGHTS.activeWebsite;
  if (signals.competitorEmailTool) s += SCORE_WEIGHTS.competitorEmailTool;
  if (signals.clearLocalSmallBusiness) s += SCORE_WEIGHTS.clearLocalSmallBusiness;
  if (signals.recentSiteActivity) s += SCORE_WEIGHTS.recentSiteActivity;
  if (signals.poorOrDeadSite) s += SCORE_WEIGHTS.poorOrDeadSite;
  if (signals.questionableFit) s += SCORE_WEIGHTS.questionableFit;
  if (signals.duplicateOrContacted) s += SCORE_WEIGHTS.duplicateOrContacted;
  if (signals.unsubscribedOrComplaintOrCustomer) {
    s += SCORE_WEIGHTS.unsubscribedOrComplaintOrCustomer;
  }
  return Math.max(0, Math.min(100, s));
}

/** Categories that imply repeat-customer marketing value. */
export const REPEAT_CUSTOMER_CATEGORIES = new Set([
  "restaurant",
  "brewery",
  "taproom",
  "salon",
  "spa",
  "retail",
  "bakery",
  "cafe",
  "fitness",
  "venue",
  "contractor",
  "real_estate",
  "nonprofit",
  "entertainment",
  "auto",
  "pet",
  "professional",
]);

export function isRepeatCustomerCategory(category: string): boolean {
  return REPEAT_CUSTOMER_CATEGORIES.has(category.toLowerCase().replace(/\s+/g, "_"));
}
