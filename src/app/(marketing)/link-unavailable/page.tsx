import Link from "next/link";

export const metadata = {
  title: "Link unavailable",
  description: "This tracked link could not be opened safely.",
  robots: { index: false, follow: false },
};

export default function LinkUnavailablePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Link check</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        This link can&apos;t be opened
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-600">
        The destination of this email link failed a safety check, so we didn&apos;t redirect you.
        If you were expecting a specific page, contact the sender directly.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover"
      >
        Go to Sendfable
      </Link>
    </div>
  );
}
