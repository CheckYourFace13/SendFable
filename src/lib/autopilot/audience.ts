export const EVERYONE_SUBSCRIBED = "Everyone subscribed";
export const AUDIENCE_MISSING = "Audience no longer available";
export const AUDIENCE_REQUIRED = "Choose who these campaigns go to";

export type WorkspaceAudience = { id: string; name: string };

export type ScribeAudienceConfig = {
  audienceType: string;
  audienceTagIds?: unknown;
  audienceSegmentId?: string | null;
  audienceChosen?: boolean;
};

export type ResolvedScribeAudience =
  | {
      ok: true;
      audienceType: "all" | "tags" | "segment";
      audienceTagIds: string[];
      audienceSegmentId: string | null;
      label: string;
      source: "explicit" | "single" | "preferred" | "empty";
    }
  | {
      ok: false;
      reason: "audience_required" | "audience_missing";
      label: string;
      audienceType: "all";
      audienceTagIds: [];
      audienceSegmentId: null;
    };

export function tagIdsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
}

export function preferredScribeAudienceTagId(onboardingData: unknown): string | null {
  if (!onboardingData || typeof onboardingData !== "object") return null;
  const id = (onboardingData as Record<string, unknown>).scribePreferredAudienceTagId;
  return typeof id === "string" && id ? id : null;
}

export function labelCampaignAudience(opts: {
  audienceType?: string | null;
  audienceTagIds?: unknown;
  audiences: WorkspaceAudience[];
}): string {
  const ids = tagIdsOf(opts.audienceTagIds);
  if (opts.audienceType === "tags") {
    const names = ids
      .map((id) => opts.audiences.find((audience) => audience.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    return names.length ? names.join(", ") : AUDIENCE_MISSING;
  }
  if (opts.audienceType === "segment") return "A segment";
  return EVERYONE_SUBSCRIBED;
}

export function campaignAudienceIsSendable(opts: {
  audienceType?: string | null;
  audienceTagIds?: unknown;
  existingTagIds: Iterable<string>;
}): { ok: true } | { ok: false; reason: "audience_missing" } {
  if (opts.audienceType !== "tags") return { ok: true };
  const ids = tagIdsOf(opts.audienceTagIds);
  const existing = new Set(opts.existingTagIds);
  if (!ids.length || ids.every((id) => !existing.has(id))) {
    return { ok: false, reason: "audience_missing" };
  }
  return { ok: true };
}

export function resolveScribeAudience(opts: {
  config: ScribeAudienceConfig | null;
  audiences: WorkspaceAudience[];
  preferredAudienceTagId?: string | null;
  segmentExists?: boolean;
}): ResolvedScribeAudience {
  const audiences = opts.audiences;
  const preferred = audiences.find((audience) => audience.id === opts.preferredAudienceTagId) || null;
  const config = opts.config;
  const type = config?.audienceType || "all";
  const chosen = Boolean(config?.audienceChosen);
  const tagIds = tagIdsOf(config?.audienceTagIds);

  if (type === "tags") {
    const live = tagIds
      .map((id) => audiences.find((audience) => audience.id === id))
      .filter((audience): audience is WorkspaceAudience => Boolean(audience));
    if (live.length) {
      return {
        ok: true,
        audienceType: "tags",
        audienceTagIds: live.map((audience) => audience.id),
        audienceSegmentId: null,
        label: live.map((audience) => audience.name).join(", "),
        source: "explicit",
      };
    }
    return {
      ok: false,
      reason: "audience_missing",
      label: AUDIENCE_MISSING,
      audienceType: "all",
      audienceTagIds: [],
      audienceSegmentId: null,
    };
  }

  if (type === "segment") {
    if (config?.audienceSegmentId && opts.segmentExists !== false) {
      return {
        ok: true,
        audienceType: "segment",
        audienceTagIds: [],
        audienceSegmentId: config.audienceSegmentId,
        label: "A segment",
        source: "explicit",
      };
    }
    return {
      ok: false,
      reason: "audience_missing",
      label: AUDIENCE_MISSING,
      audienceType: "all",
      audienceTagIds: [],
      audienceSegmentId: null,
    };
  }

  if (type === "all" && chosen) {
    return {
      ok: true,
      audienceType: "all",
      audienceTagIds: [],
      audienceSegmentId: null,
      label: EVERYONE_SUBSCRIBED,
      source: "explicit",
    };
  }

  if (audiences.length === 0) {
    return {
      ok: true,
      audienceType: "all",
      audienceTagIds: [],
      audienceSegmentId: null,
      label: EVERYONE_SUBSCRIBED,
      source: "empty",
    };
  }

  if (audiences.length === 1) {
    const only = audiences[0]!;
    return {
      ok: true,
      audienceType: "tags",
      audienceTagIds: [only.id],
      audienceSegmentId: null,
      label: only.name,
      source: "single",
    };
  }

  if (preferred) {
    return {
      ok: true,
      audienceType: "tags",
      audienceTagIds: [preferred.id],
      audienceSegmentId: null,
      label: preferred.name,
      source: "preferred",
    };
  }

  return {
    ok: false,
    reason: "audience_required",
    label: AUDIENCE_REQUIRED,
    audienceType: "all",
    audienceTagIds: [],
    audienceSegmentId: null,
  };
}
