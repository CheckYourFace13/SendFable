import Link from "next/link";
import { publicSignupAllowed } from "@/lib/early-launch";

/** Marketing top bar: waitlist while locked; compact start-free cue once signup is open. */
export function AnnouncementBar() {
  if (!publicSignupAllowed()) {
    return (
      <div className="border-b border-ink/10 bg-ink text-page">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2.5 text-center text-sm sm:px-6">
          <p className="text-page/90">
            SendFable is preparing public signup —{" "}
            <Link
              href="/early-access"
              className="font-medium text-[#FFB4A4] underline decoration-[#FFB4A4]/40 underline-offset-2 transition-colors hover:text-page hover:decoration-page"
            >
              join the waitlist
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-ink/10 bg-ink text-page">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2.5 text-center text-sm sm:px-6">
        <p className="text-page/90">
          SendFable email marketing is live —{" "}
          <Link
            href="/signup"
            className="font-medium text-[#FFB4A4] underline decoration-[#FFB4A4]/40 underline-offset-2 transition-colors hover:text-page hover:decoration-page"
          >
            start free
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
