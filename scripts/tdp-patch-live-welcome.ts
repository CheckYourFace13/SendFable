/**
 * Update live automatic welcome template HTML and unsent DRAFT welcome campaigns.
 * Does not resend to existing subscribers.
 */
import { prisma } from "../src/lib/prisma";
import { theDrinkPlaceWelcomeHtml } from "../src/lib/newsletter/welcome-html";
import { compileEmailHtml, type EmailDesign } from "../src/lib/email-compiler";
import { randomToken } from "../src/lib/utils";

async function main() {
  const ws = await prisma.workspace.findFirst({
    where: { isInternal: true, name: "TheDrinkPlace" },
  });
  if (!ws) throw new Error("TheDrinkPlace missing");
  const html = theDrinkPlaceWelcomeHtml();
  const design: EmailDesign = {
    version: 1,
    blocks: [
      { id: randomToken(8), type: "text", props: { html, align: "left" } },
      { id: randomToken(8), type: "footer", props: { mailingAddress: "" } },
    ],
    settings: {
      backgroundColor: "#f0f7fc",
      contentWidth: 600,
      fontFamily: "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    },
  };
  const compiledHtml = compileEmailHtml(design, {
    businessName: ws.name,
    mailingAddress: ws.mailingAddress || "",
    showSendfableBadge: false,
    previewText: "Discover your next great drink—close to home or somewhere new.",
  });

  const drafts = await prisma.campaign.findMany({
    where: {
      workspaceId: ws.id,
      status: { in: ["DRAFT", "SCHEDULED", "PAUSED"] },
      OR: [
        { goal: "welcome" },
        { name: { contains: "Welcome", mode: "insensitive" } },
        { subject: { contains: "Welcome", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, status: true, compiledHtml: true },
  });

  let updated = 0;
  for (const c of drafts) {
    const body = c.compiledHtml || "";
    if (/Chicago drink guide|nationwide claim|not invented prices/i.test(body) || c.name.toLowerCase().includes("welcome")) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: {
          designJson: design as object,
          compiledHtml,
          previewText: "Discover your next great drink—close to home or somewhere new.",
          subject: c.name.toLowerCase().includes("welcome") ? `Welcome to ${ws.name}` : undefined,
        },
      });
      updated++;
    }
  }
  console.log(JSON.stringify({ workspaceId: ws.id, unsentWelcomeCampaigns: drafts.length, updated, chicagoInNewHtml: /chicago/i.test(html) }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
