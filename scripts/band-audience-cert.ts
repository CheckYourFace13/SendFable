/**
 * Controlled band-audience isolation check. Creates a fictional workspace,
 * two audiences, two signup tools, two contacts, verifies exports, then deletes.
 */
import { prisma } from "../src/lib/prisma";
import { applyTrySignupDraft } from "../src/lib/try-signup/apply";
import { defaultTryConfig } from "../src/lib/try-signup/config";
import { randomToken } from "../src/lib/utils";
import {
  EVERYONE_SUBSCRIBED,
  preferredScribeAudienceTagId,
  resolveScribeAudience,
} from "../src/lib/autopilot/audience";

async function main() {
  const token = randomToken(18);
  const draft = await prisma.trySignupDraft.create({
    data: { token, config: defaultTryConfig("band") },
  });

  const workspace = await prisma.workspace.create({
    data: { name: "Harbor Lights Band CERT" },
  });

  const applied = await applyTrySignupDraft({ workspaceId: workspace.id, token: draft.token });
  if (!applied.ok) throw new Error(`apply failed: ${applied.reason}`);

  const tags = await prisma.tag.findMany({ where: { workspaceId: workspace.id } });
  const fans = tags.find((t) => t.name === "Fans");
  const venues = tags.find((t) => t.name === "Venues");
  if (!fans || !venues) throw new Error("missing Fans/Venues");

  const venueForm = await prisma.signupForm.create({
    data: {
      workspaceId: workspace.id,
      name: "Venues",
      fields: [{ key: "email", label: "Email", type: "email", required: true }],
      tagIds: [venues.id],
      requirementMode: "email-required",
      hostedSlug: `venues-${randomToken(4)}`,
      status: "ACTIVE",
    },
  });

  const fan = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      email: "fan@harborlights.test",
      status: "SUBSCRIBED",
      source: "form:fans",
      tags: { create: { tagId: fans.id } },
    },
  });
  const venue = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      email: "booker@room.test",
      status: "SUBSCRIBED",
      source: "form:venues",
      tags: { create: { tagId: venues.id } },
    },
  });

  const fansOnly = await prisma.contact.findMany({
    where: { workspaceId: workspace.id, tags: { some: { tagId: fans.id } } },
  });
  const venuesOnly = await prisma.contact.findMany({
    where: { workspaceId: workspace.id, tags: { some: { tagId: venues.id } } },
  });
  if (fansOnly.length !== 1 || fansOnly[0]?.id !== fan.id) throw new Error("Fans leak");
  if (venuesOnly.length !== 1 || venuesOnly[0]?.id !== venue.id) throw new Error("Venues leak");

  const afterApply = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspace.id },
    select: { onboardingData: true },
  });
  const preferred = preferredScribeAudienceTagId(afterApply.onboardingData);
  if (preferred !== fans.id) throw new Error("try-builder did not store Fans as Scribe default");
  const scribe = await prisma.marketingAutopilotConfig.findUnique({
    where: { workspaceId: workspace.id },
  });
  if (scribe?.enabled) throw new Error("apply must not enable Scribe");

  const audienceList = [
    { id: fans.id, name: fans.name },
    { id: venues.id, name: venues.name },
  ];
  const defaultAudience = resolveScribeAudience({
    config: scribe,
    audiences: audienceList,
    preferredAudienceTagId: preferred,
  });
  if (!defaultAudience.ok || defaultAudience.label !== "Fans") {
    throw new Error("Scribe default was not Fans");
  }

  const fansDraft = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: "Scribe: Friday show",
      status: "DRAFT",
      channel: "EMAIL",
      subject: "Friday show",
      audienceType: defaultAudience.audienceType,
      audienceTagIds: defaultAudience.audienceTagIds,
    },
  });
  if (fansDraft.audienceType !== "tags") throw new Error("Fans draft used Everyone subscribed");
  if (JSON.stringify(fansDraft.audienceTagIds) !== JSON.stringify([fans.id])) {
    throw new Error("Fans draft audience mismatch");
  }

  const venuesResolved = resolveScribeAudience({
    config: {
      audienceType: "tags",
      audienceTagIds: [venues.id],
      audienceChosen: true,
    },
    audiences: audienceList,
  });
  if (!venuesResolved.ok || venuesResolved.label !== "Venues") {
    throw new Error("Venues default failed");
  }
  const venuesDraft = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      name: "Scribe: Booking update",
      status: "DRAFT",
      channel: "EMAIL",
      subject: "Booking update",
      audienceType: venuesResolved.audienceType,
      audienceTagIds: venuesResolved.audienceTagIds,
    },
  });
  if (venuesDraft.audienceType !== "tags") throw new Error("Venues draft used Everyone subscribed");
  if (JSON.stringify(venuesDraft.audienceTagIds) !== JSON.stringify([venues.id])) {
    throw new Error("Venues draft audience mismatch");
  }
  if (venuesDraft.status !== "DRAFT" || fansDraft.status !== "DRAFT") {
    throw new Error("band drafts must stay DRAFT");
  }

  const afterDelete = resolveScribeAudience({
    config: {
      audienceType: "tags",
      audienceTagIds: [fans.id],
      audienceChosen: true,
    },
    audiences: [{ id: venues.id, name: venues.name }],
  });
  if (afterDelete.ok || afterDelete.label === EVERYONE_SUBSCRIBED) {
    throw new Error("deleted Fans silently fell back to Everyone subscribed");
  }

  await prisma.workspace.delete({ where: { id: workspace.id } });
  await prisma.trySignupDraft.delete({ where: { id: draft.id } }).catch(() => undefined);

  console.log(
    JSON.stringify({
      ok: true,
      fans: fans.name,
      venues: venues.name,
      formId: applied.formId,
      venueFormId: venueForm.id,
      scribeDefault: defaultAudience.label,
      fansDraftAudience: "Fans",
      venuesDraftAudience: "Venues",
      autoSend: "NONE",
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
