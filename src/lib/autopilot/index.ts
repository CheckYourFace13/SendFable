export { runAutopilotTick } from "@/lib/autopilot/tick";
export {
  sendAutopilotApprovalEmail,
  loadAutopilotReview,
  executeAutopilotAction,
  verifyAutopilotActionToken,
} from "@/lib/autopilot/approval";
export {
  autopilotAllowedFrequencies,
  clampAutopilotFrequency,
  autopilotMaxDraftsPerMonth,
} from "@/lib/autopilot/plans";
export { htmlToVisibleText, normalizeForHash } from "@/lib/autopilot/extract";
export { contentFingerprint, changeFingerprint } from "@/lib/autopilot/hash";
export { assessChange, addedLines } from "@/lib/autopilot/change-filter";
export { generateExtractive, generateWithOptionalLlm } from "@/lib/autopilot/generate";
