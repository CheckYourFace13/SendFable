"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { appendUtmParams } from "@/lib/utm-preserve";

type LinkProps = React.ComponentProps<typeof Link>;

function UtmLinkInner({ href, ...rest }: LinkProps) {
  const search = useSearchParams().toString();
  const next = typeof href === "string" ? appendUtmParams(href, search) : href;
  return <Link href={next} {...rest} />;
}

/** Internal link that keeps utm_* from the current page. Falls back to the plain href. */
export function UtmLink(props: LinkProps) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <UtmLinkInner {...props} />
    </Suspense>
  );
}
