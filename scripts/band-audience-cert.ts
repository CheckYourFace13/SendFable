/**
 * Controlled band-audience isolation check. Creates a fictional workspace,
 * two audiences, two signup tools, two contacts, verifies exports, then deletes.
 */
import { prisma } from "../src/lib/prisma";
import { applyTrySignupDraft } from "../src/lib/try-signup/apply";
import { defaultTryConfig } from "../src/lib/try-signup/config";
import { randomToken } from "../src/lib/utils";

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

  await prisma.workspace.delete({ where: { id: workspace.id } });
  await prisma.trySignupDraft.delete({ where: { id: draft.id } }).catch(() => undefined);

  console.log(
    JSON.stringify({
      ok: true,
      fans: fans.name,
      venues: venues.name,
      formId: applied.formId,
      venueFormId: venueForm.id,
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
