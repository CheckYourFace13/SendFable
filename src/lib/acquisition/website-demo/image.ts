import { assertSafePublicUrl } from "@/lib/ssrf";
import { sameSiteImage } from "@/lib/acquisition/website-demo/extract";

export type ImageCheck = "ok" | "reject" | "unknown";

/** Confirm a same-site image URL. Unknown means the check could not finish — caller may keep a statically filtered URL. */
export async function confirmSameSiteImage(url: string, pageUrl: string): Promise<ImageCheck> {
  if (!sameSiteImage(url, pageUrl)) return "reject";
  try {
    const safe = await assertSafePublicUrl(url);
    const res = await fetch(safe.toString(), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "image/*", Range: "bytes=0-1023" },
    });
    if (res.status >= 400) return "reject";
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (!type) return "unknown";
    if (!type.startsWith("image/") || type.includes("svg")) return "reject";
    return "ok";
  } catch {
    return "unknown";
  }
}
