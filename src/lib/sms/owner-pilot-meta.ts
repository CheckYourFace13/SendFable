/**
 * Owner SMS pilot metadata stored on SmsComplianceProfile.internalNotes.
 * Never store EIN here. Pilot phone is E.164 only (not a tax ID).
 */

export const OWNER_PILOT_EXPECTED_LEGAL_NAME = "iScream Studio INC";
export const OWNER_PILOT_DEFAULT_WORKSPACE_ID = "cmrry4tfe0001aqx1xw328ghq";

export interface OwnerPilotMeta {
  enabled: boolean;
  workspaceId: string;
  pilotPhoneE164: string | null;
  registrationUnlocked: boolean;
  numberPurchaseUnlocked: boolean;
  liveSendingUnlocked: boolean;
  inboundUnlocked: boolean;
  submittedToProviderAt: string | null;
  lastNotifyStatus: string | null;
}

const DEFAULT_META: OwnerPilotMeta = {
  enabled: false,
  workspaceId: OWNER_PILOT_DEFAULT_WORKSPACE_ID,
  pilotPhoneE164: null,
  registrationUnlocked: false,
  numberPurchaseUnlocked: false,
  liveSendingUnlocked: false,
  inboundUnlocked: false,
  submittedToProviderAt: null,
  lastNotifyStatus: null,
};

type NotesEnvelope = {
  ownerPilot?: Partial<OwnerPilotMeta>;
  /** Preserve any prior free-text notes outside structured pilot meta */
  notes?: string;
};

export function parseOwnerPilotMeta(internalNotes: string | null | undefined): OwnerPilotMeta {
  if (!internalNotes?.trim()) return { ...DEFAULT_META };
  try {
    const parsed = JSON.parse(internalNotes) as NotesEnvelope;
    if (!parsed || typeof parsed !== "object" || !parsed.ownerPilot) {
      return { ...DEFAULT_META };
    }
    const o = parsed.ownerPilot;
    return {
      enabled: Boolean(o.enabled),
      workspaceId:
        typeof o.workspaceId === "string" && o.workspaceId.trim()
          ? o.workspaceId.trim()
          : DEFAULT_META.workspaceId,
      pilotPhoneE164:
        typeof o.pilotPhoneE164 === "string" && o.pilotPhoneE164.startsWith("+")
          ? o.pilotPhoneE164
          : null,
      registrationUnlocked: Boolean(o.registrationUnlocked),
      numberPurchaseUnlocked: Boolean(o.numberPurchaseUnlocked),
      liveSendingUnlocked: Boolean(o.liveSendingUnlocked),
      inboundUnlocked: Boolean(o.inboundUnlocked),
      submittedToProviderAt:
        typeof o.submittedToProviderAt === "string" ? o.submittedToProviderAt : null,
      lastNotifyStatus: typeof o.lastNotifyStatus === "string" ? o.lastNotifyStatus : null,
    };
  } catch {
    return { ...DEFAULT_META };
  }
}

export function writeOwnerPilotMeta(
  internalNotes: string | null | undefined,
  patch: Partial<OwnerPilotMeta>
): string {
  let envelope: NotesEnvelope = {};
  if (internalNotes?.trim()) {
    try {
      const parsed = JSON.parse(internalNotes) as NotesEnvelope;
      if (parsed && typeof parsed === "object") envelope = parsed;
      else envelope = { notes: internalNotes };
    } catch {
      envelope = { notes: internalNotes };
    }
  }
  const current = parseOwnerPilotMeta(internalNotes);
  envelope.ownerPilot = { ...current, ...patch };
  return JSON.stringify(envelope);
}

export function ownerPilotDefaultsForForm() {
  const brand = OWNER_PILOT_EXPECTED_LEGAL_NAME;
  return {
    selectedPlan: "TEXT_ESSENTIALS" as const,
    legalEntityName: brand,
    dbaBrandName: "SendFable",
    registrationType: "10DLC" as const,
    registrationCountry: "US",
    entityType: "PRIVATE_PROFIT" as const,
    country: "US",
    websiteUrl: "https://sendfable.com",
    supportEmail: "chris@iscreamstudio.com",
    industryVertical: "TECHNOLOGY",
    smsUseCase: "MARKETING" as const,
    estimatedMonthlyVolume: 100,
    privacyPolicyUrl: "https://sendfable.com/privacy",
    smsTermsUrl: "https://sendfable.com/terms",
    optInFormUrl: "https://sendfable.com/privacy",
    optInEvidenceUrl: "https://sendfable.com/privacy",
    optInDescription:
      "Customers provide their mobile number and check an explicit SMS consent box on SendFable contact forms and contact import flows. Consent language discloses brand identity, message frequency, Msg & data rates, STOP to unsubscribe, HELP for help, and that consent is not a condition of purchase. Only opted-in numbers receive marketing texts.",
    sampleMessage1: `${brand} (via SendFable): Thanks for joining! Get offers & updates. Msg frequency varies. Msg&data rates may apply. Reply STOP to opt out, HELP for help.`,
    sampleMessage2: `${brand}: Reminder about your next offer. Reply STOP to unsubscribe. Msg&data rates may apply.`,
    helpResponse: `${brand}: For help, contact chris@iscreamstudio.com. Msg&data rates may apply. Reply STOP to unsubscribe.`,
    stopResponse: `You are unsubscribed from ${brand} texts. No more messages will be sent. Reply HELP for help.`,
  };
}
