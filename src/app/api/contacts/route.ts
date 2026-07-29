import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { contactCreateSchema } from "@/lib/validators/audience";
import { PLANS } from "@/lib/plans";
import {
  isSmsSuppressed,
  matchExistingContact,
  recordIntakeConflict,
  validateIntakeIdentifiers,
} from "@/lib/sms/contact-intake";
import { applyOptIn } from "@/lib/sms/consent";
import { trackEvent } from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";

export async function GET(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status") || "";
  const tagId = url.searchParams.get("tagId") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 25)));

  const where: Prisma.ContactWhereInput = { workspaceId: ctx.workspace.id };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status as Prisma.EnumContactStatusFilter;
  if (tagId) where.tags = { some: { tagId } };

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ contacts, total, page, pageSize });
}

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = contactCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const ids = validateIntakeIdentifiers(parsed.data.email, parsed.data.phone);
  if (!ids.ok) {
    return NextResponse.json({ error: ids.error }, { status: 400 });
  }
  if (parsed.data.phone?.trim() && !ids.phoneE164) {
    // Phone was provided but is invalid/ambiguous — never guess.
    return NextResponse.json({ error: "Invalid US mobile number" }, { status: 400 });
  }
  const email = ids.email;
  const phoneE164 = ids.phoneE164;

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  const count = await prisma.contact.count({ where: { workspaceId: ctx.workspace.id } });
  if (count >= PLANS[owner.plan].contactCap) {
    return NextResponse.json(
      { error: "Contact cap reached for your plan", upgradeRequired: true },
      { status: 402 }
    );
  }

  // Split-identity guard: email matching one contact and phone matching a
  // different contact never merges automatically.
  const match = await matchExistingContact(ctx.workspace.id, { email, phoneE164 });
  if (match.kind === "conflict") {
    await recordIntakeConflict(ctx.workspace.id, match, "manual");
    return NextResponse.json(
      {
        error:
          "This email and phone belong to two different contacts. Resolve the conflict from the contacts page.",
        conflict: true,
      },
      { status: 409 }
    );
  }
  if (match.kind === "existing") {
    return NextResponse.json({ error: "Contact already exists" }, { status: 409 });
  }

  // SMS consent: explicit only — a stored phone alone grants nothing, and a
  // previously opted-out (suppressed) number stays opted out.
  let smsStatus: "NOT_PROVIDED" | "PENDING_CONSENT" | "SUBSCRIBED" | "OPTED_OUT" = "NOT_PROVIDED";
  let smsConsentAt: Date | null = null;
  let smsConsentSource: string | null = null;
  if (phoneE164) {
    const suppressed = await isSmsSuppressed(ctx.workspace.id, phoneE164);
    if (suppressed) {
      smsStatus = "OPTED_OUT";
    } else if (parsed.data.smsConsent) {
      const result = applyOptIn({
        currentStatus: "NOT_PROVIDED",
        source: parsed.data.smsConsentSource || "manual",
        disclosureVersion: null,
        suppressed: false,
        documentedNewOptIn: true,
      });
      if (result.accepted) {
        smsStatus = "SUBSCRIBED";
        smsConsentAt = new Date();
        smsConsentSource = parsed.data.smsConsentSource || "manual";
      }
    } else {
      smsStatus = "PENDING_CONSENT";
    }
  }

  try {
    const contact = await prisma.contact.create({
      data: {
        workspaceId: ctx.workspace.id,
        email,
        phoneE164,
        smsStatus,
        smsConsentAt,
        smsConsentSource,
        smsOptedOutAt: smsStatus === "OPTED_OUT" ? new Date() : null,
        firstName: parsed.data.firstName || null,
        lastName: parsed.data.lastName || null,
        company: parsed.data.company || null,
        customFields: parsed.data.customFields ?? {},
        source: parsed.data.source || "manual",
        tags: parsed.data.tagIds?.length
          ? { create: parsed.data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
    if (phoneE164 && smsStatus === "SUBSCRIBED") {
      await prisma.smsConsentEvent.create({
        data: {
          workspaceId: ctx.workspace.id,
          contactId: contact.id,
          phoneE164,
          action: "OPT_IN",
          source: smsConsentSource || "manual",
        },
      });
    }
    try {
      ensureAnalyticsPersistence();
      trackEvent("contact_created");
    } catch {
      /* fail open */
    }
    return NextResponse.json({ contact }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Contact already exists" }, { status: 409 });
    }
    throw e;
  }
}
