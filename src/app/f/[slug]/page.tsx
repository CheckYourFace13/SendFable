import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HostedFormClient } from "./form-client";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const form = await prisma.signupForm.findUnique({
    where: { hostedSlug: params.slug },
    select: { name: true },
  });
  if (!form) {
    return {
      title: "Form not found · SendFable",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${form.name} · SendFable`,
    robots: { index: false, follow: false },
  };
}

export default async function HostedFormPage({ params }: Props) {
  const form = await prisma.signupForm.findUnique({
    where: { hostedSlug: params.slug },
    select: { id: true },
  });
  if (!form) notFound();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <HostedFormClient slug={params.slug} />
    </Suspense>
  );
}
