"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * If a try-builder draft is waiting in localStorage, finish it and send the
 * signed-in user to that signup tool instead of extra profile setup.
 */
export function TrySignupResume() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let token: string | null = null;
    try {
      token = localStorage.getItem("sf_try_signup");
    } catch {
      return;
    }
    if (!token) return;

    if (pathname.startsWith("/forms")) {
      try {
        localStorage.removeItem("sf_try_signup");
      } catch {
        /* ignore */
      }
      return;
    }
    if (pathname !== "/dashboard" && pathname !== "/onboarding") return;

    void (async () => {
      const res = await fetch("/api/try/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      try {
        localStorage.removeItem("sf_try_signup");
      } catch {
        /* ignore */
      }
      if (res.ok && typeof data?.formId === "string" && data.formId) {
        const platform = typeof data.platform === "string" ? data.platform : "wordpress";
        router.replace(`/forms/${data.formId}?live=1&platform=${encodeURIComponent(platform)}`);
      }
    })();
  }, [pathname, router]);

  return null;
}
