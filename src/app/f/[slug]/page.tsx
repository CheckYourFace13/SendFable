import { Suspense } from "react";
import { HostedFormClient } from "./form-client";

export default function HostedFormPage({ params }: { params: { slug: string } }) {
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
