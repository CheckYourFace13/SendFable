export {
  acquisitionEnabled,
  acquisitionDiscoveryEnabled,
  acquisitionSendingEnabled,
  acquisitionDailyNewLimit,
  acquisitionDailyTotalLimit,
  acquisitionMinScore,
  reportAcquisitionFlags,
  ACQUISITION_FLAG_DEFAULTS,
} from "@/lib/acquisition/flags";
export { scoreProspect, SCORE_WEIGHTS } from "@/lib/acquisition/scoring";
export {
  normalizeDomain,
  normalizeWebsite,
  isValidEmailSyntax,
} from "@/lib/acquisition/normalize";
export { runDiscovery } from "@/lib/acquisition/discovery/discover";
export { analyzeHtml, enrichWebsite } from "@/lib/acquisition/discovery/enrich";
export { runAcquisitionTick } from "@/lib/acquisition/tick";
export { getAcquisitionDashboard } from "@/lib/acquisition/report";
export {
  matchSignupToAcquisition,
  recordAcquisitionReply,
  handleAcquisitionSesEvent,
} from "@/lib/acquisition/lifecycle";
