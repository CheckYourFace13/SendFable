import type { Plan } from "@prisma/client";
import { PLANS } from "@/lib/plans";
import {
  autopilotAllowedFrequencies,
  autopilotMaxDraftsPerMonth,
} from "@/lib/autopilot/plans";
import type { AutopilotFrequency } from "@/lib/autopilot/types";

/** Software entitlement for SendFable-owned internal workspaces. Not a Stripe plan. */
export const OWNER_INTERNAL_UNLIMITED = "OWNER_INTERNAL_UNLIMITED" as const;

export const INTERNAL_ENTITLEMENT_LABEL = "Internal — Unlimited";

export type SoftwareQuotas = {
  entitlement: typeof OWNER_INTERNAL_UNLIMITED | Plan;
  label: string;
  /** null means no software cap. SMS provider usage is never included here. */
  contactCap: number | null;
  emailsPerMonth: number | null;
  autopilotDraftsPerMonth: number | null;
  autopilotFrequencies: AutopilotFrequency[];
  seats: number | null;
  customDomains: boolean;
  /** Internal owner mail keeps the SendFable footer on purpose. */
  showSendfableBadge: boolean;
};

export function isOwnerInternalWorkspace(input: {
  isInternal: boolean;
  disabled?: boolean;
}): boolean {
  return input.isInternal && !input.disabled;
}

export function softwareQuotas(input: {
  isInternal: boolean;
  disabled?: boolean;
  plan: Plan;
}): SoftwareQuotas {
  if (isOwnerInternalWorkspace(input)) {
    return {
      entitlement: OWNER_INTERNAL_UNLIMITED,
      label: INTERNAL_ENTITLEMENT_LABEL,
      contactCap: null,
      emailsPerMonth: null,
      autopilotDraftsPerMonth: null,
      autopilotFrequencies: ["DAILY", "TWICE_DAILY", "WEEKLY"],
      seats: null,
      customDomains: true,
      showSendfableBadge: true,
    };
  }
  const plan = PLANS[input.plan];
  return {
    entitlement: input.plan,
    label: plan.name,
    contactCap: plan.contactCap,
    emailsPerMonth: plan.emailsPerMonth,
    autopilotDraftsPerMonth: autopilotMaxDraftsPerMonth(input.plan),
    autopilotFrequencies: autopilotAllowedFrequencies(input.plan),
    seats: plan.seats,
    customDomains: plan.customDomains,
    showSendfableBadge: plan.badge,
  };
}

export function showSendfableBadgeFor(input: {
  isInternal: boolean;
  disabledAt?: Date | null;
  plan: Plan;
}): boolean {
  return softwareQuotas({
    isInternal: input.isInternal,
    disabled: Boolean(input.disabledAt),
    plan: input.plan,
  }).showSendfableBadge;
}

/** Numeric cap for existing comparisons. Unlimited is not a public plan number. */
export function numericCap(cap: number | null): number {
  return cap ?? Number.MAX_SAFE_INTEGER;
}

export type SwitcherWorkspace = { id: string; name: string; isInternal?: boolean };

/**
 * Owner switcher lists internal businesses only.
 * A normal member with several of their own workspaces can switch those,
 * and never sees internal owner businesses or admin actions.
 */
export function workspaceSwitcherModel(input: {
  isOwnerAdmin: boolean;
  internalWorkspaces: SwitcherWorkspace[];
  memberships: SwitcherWorkspace[];
}): {
  mode: "owner" | "member" | "plain";
  businesses: { id: string; name: string }[];
  showAdminLinks: boolean;
} {
  if (input.isOwnerAdmin) {
    return {
      mode: "owner",
      businesses: input.internalWorkspaces
        .filter((w) => w.isInternal !== false)
        .map((w) => ({ id: w.id, name: w.name })),
      showAdminLinks: true,
    };
  }
  const own = input.memberships.filter((w) => !w.isInternal);
  if (own.length > 1) {
    return {
      mode: "member",
      businesses: own.map((w) => ({ id: w.id, name: w.name })),
      showAdminLinks: false,
    };
  }
  return { mode: "plain", businesses: [], showAdminLinks: false };
}
