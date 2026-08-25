import type { AcquisitionProspect } from "@prisma/client";
import { acquisitionFromAddress, acquisitionMinScore } from "@/lib/acquisition/flags";
import { isValidEmailSyntax } from "@/lib/acquisition/normalize";
import { openerLooksFabricated } from "@/lib/acquisition/personalize";
import { isSuppressed, TERMINAL_SUPPRESSION_STATUSES } from "@/lib/acquisition/suppression";

export type QualityGateResult = {
  ok: boolean;
  failures: string[];
};

export async function runQualityGate(
  prospect: Pick<
    AcquisitionProspect,
    | "id"
    | "website"
    | "domain"
    | "contactEmail"
    | "score"
    | "status"
    | "personalizationClaim"
    | "personalizationEvidence"
    | "personalizationSourceUrl"
    | "generatedOpener"
    | "activeWebsite"
  >,
  opts?: { requireFrom?: boolean; skipWebsiteLiveCheck?: boolean }
): Promise<QualityGateResult> {
  const failures: string[] = [];

  if (TERMINAL_SUPPRESSION_STATUSES.includes(prospect.status as never)) {
    failures.push("terminal_status");
  }
  if (!prospect.contactEmail || !isValidEmailSyntax(prospect.contactEmail)) {
    failures.push("invalid_email");
  }
  if (prospect.score < acquisitionMinScore()) {
    failures.push("score_below_threshold");
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

  const supp = await isSuppressed(prospect.contactEmail, prospect.domain);
  if (supp.suppressed) failures.push(`suppressed:${supp.reason}`);

  if (opts?.requireFrom !== false) {
    if (!acquisitionFromAddress()) failures.push("acquisition_from_not_configured");
  }

  // Unsubscribe presence checked at send-time on body text
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
