import type { AcquisitionProspect } from "@prisma/client";
import { acquisitionFromAddress, acquisitionMinScore } from "@/lib/acquisition/flags";
import {
  isLikelyPersonalConsumerEmail,
  isValidEmailSyntax,
  normalizeDomain,
} from "@/lib/acquisition/normalize";
import { openerLooksFabricated } from "@/lib/acquisition/personalize";
import { isSuppressed, TERMINAL_SUPPRESSION_STATUSES } from "@/lib/acquisition/suppression";

export type QualityGateResult = {
  ok: boolean;
  failures: string[];
};

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

/** Email domain must match website domain (or subdomain). No guessed consumer mail. */
export function emailMatchesWebsiteDomain(
  email: string,
  websiteDomain: string
): boolean {
  const ed = normalizeDomain(email.split("@")[1] || "");
  const wd = normalizeDomain(websiteDomain);
  if (!ed || !wd) return false;
  return ed === wd || ed.endsWith(`.${wd}`) || wd.endsWith(`.${ed}`);
}

export function isUsBusinessState(state?: string | null): boolean {
  if (!state) return false;
  return US_STATES.has(state.trim().toUpperCase());
}

export async function runQualityGate(
  prospect: Pick<
    AcquisitionProspect,
    | "id"
    | "website"
    | "domain"
    | "contactEmail"
    | "score"
    | "status"
    | "state"
    | "personalizationClaim"
    | "personalizationEvidence"
    | "personalizationSourceUrl"
    | "generatedOpener"
    | "activeWebsite"
  >,
  opts?: {
    requireFrom?: boolean;
    skipWebsiteLiveCheck?: boolean;
    /** Stricter auto-send rules */
    autonomous?: boolean;
  }
): Promise<QualityGateResult> {
  const failures: string[] = [];
  const autonomous = opts?.autonomous !== false;

  if (TERMINAL_SUPPRESSION_STATUSES.includes(prospect.status as never)) {
    failures.push("terminal_status");
  }
  if (!prospect.contactEmail || !isValidEmailSyntax(prospect.contactEmail)) {
    failures.push("invalid_email");
  } else {
    if (isLikelyPersonalConsumerEmail(prospect.contactEmail)) {
      failures.push("consumer_email");
    }
    if (!emailMatchesWebsiteDomain(prospect.contactEmail, prospect.domain)) {
      failures.push("email_domain_mismatch");
    }
  }
  if (prospect.score < acquisitionMinScore()) {
    failures.push("score_below_threshold");
  }
  if (autonomous && !isUsBusinessState(prospect.state)) {
    failures.push("not_us_state");
  }
  if (!prospect.personalizationClaim?.trim()) failures.push("missing_claim");
  if (!prospect.personalizationEvidence?.trim()) failures.push("missing_evidence");
  if (!prospect.personalizationSourceUrl?.trim()) failures.push("missing_source_url");
  if (!prospect.generatedOpener?.trim()) failures.push("missing_opener");
  if (prospect.generatedOpener && openerLooksFabricated(prospect.generatedOpener)) {
    failures.push("fabricated_opener");
  }
  if (!prospect.activeWebsite && !opts?.skipWebsiteLiveCheck) {
    failures.push("inactive_website");
  }

  // Source URL should be on the same domain
  if (prospect.personalizationSourceUrl) {
    const srcDom = normalizeDomain(prospect.personalizationSourceUrl);
    if (srcDom && srcDom !== prospect.domain && !srcDom.endsWith(`.${prospect.domain}`)) {
      failures.push("source_domain_mismatch");
    }
  }

  const supp = await isSuppressed(prospect.contactEmail, prospect.domain);
  if (supp.suppressed) failures.push(`suppressed:${supp.reason}`);

  if (opts?.requireFrom !== false) {
    if (!acquisitionFromAddress()) failures.push("acquisition_from_not_configured");
  }

  return { ok: failures.length === 0, failures };
}

export function bodyHasUnsubscribe(body: string): boolean {
  const b = body.toLowerCase();
  return (
    b.includes("unsubscribe") ||
    b.includes("no thanks") ||
    b.includes("rather not hear")
  );
}
