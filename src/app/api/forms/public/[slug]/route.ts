import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const form = await prisma.signupForm.findUnique({
    where: { hostedSlug: params.slug },
    select: {
      name: true,
      fields: true,
      doubleOptIn: true,
      hostedSlug: true,
    },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ form });
}
