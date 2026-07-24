import Link from "next/link";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        That page doesn&apos;t exist
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-600">
        The link may be outdated or mistyped. Head back to the homepage, or sign in to reach your
        dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white hover:bg-coral-hover"
        >
          Go to homepage
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
