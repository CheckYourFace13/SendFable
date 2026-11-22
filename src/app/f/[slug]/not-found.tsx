import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Form not found · SendFable",
  robots: { index: false, follow: false },
};

export default function HostedFormNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-ink">Form not found</h1>
      <p className="max-w-md text-sm text-ink/70">
        This signup form does not exist or is no longer available.
      </p>
      <Link href="/" className="text-sm font-medium text-coral hover:underline">
        Go to SendFable
      </Link>
    </div>
  );
}
