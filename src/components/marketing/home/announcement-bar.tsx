import Link from "next/link";

export function AnnouncementBar() {
  return (
    <div className="border-b border-ink/10 bg-ink text-page">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2.5 text-center text-sm sm:px-6">
        <p className="text-page/90">
          Sendfable is being written now —{" "}
          <Link
            href="/early-access"
            className="font-medium text-[#FFB4A4] underline decoration-[#FFB4A4]/40 underline-offset-2 transition-colors hover:text-page hover:decoration-page"
          >
            join the early-access list
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
