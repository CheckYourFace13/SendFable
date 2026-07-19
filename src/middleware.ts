import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

/** Exact public paths (marketing + auth entry). */
const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/features",
  "/deliverability",
  "/templates",
  "/migrate",
  "/security",
  "/status",
  "/integrations",
  "/email-marketing-guide",
  "/resources",
  "/changelog",
  "/cheap-email-marketing",
  "/email-marketing-without-gmail",
  "/terms",
  "/privacy",
  "/robots.txt",
  "/sitemap.xml",
  "/feed.xml",
  "/llms.txt",
  "/early-access",
  "/early-access/thanks",
]);

/** Public path prefixes (trailing segment routes). */
const PUBLIC_PREFIXES = [
  "/login/",
  "/signup/",
  "/vs/",
  "/compare/",
  "/solutions/",
  "/alternatives/",
  "/f/",
  "/a/",
  "/unsubscribe/",
  "/invite/",
  "/api/",
  "/uploads/",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // NextAuth may attach a truthy empty auth object — require a user id.
  const isLoggedIn = Boolean(req.auth?.user?.id || req.auth?.user?.email);

  const earlyLaunch =
    process.env.EARLY_LAUNCH !== "false" &&
    process.env.EARLY_LAUNCH !== "0" &&
    (process.env.NODE_ENV === "production" ||
      process.env.EARLY_LAUNCH === "true" ||
      process.env.EARLY_LAUNCH === "1");

  // Brand gallery is internal — require login in production.
  if (pathname === "/brand" || pathname.startsWith("/brand/")) {
    if (!isLoggedIn) {
      const url = new URL("/login", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Early launch: public signup closed → early-access page.
  if (
    earlyLaunch &&
    process.env.ALLOW_PUBLIC_SIGNUP !== "true" &&
    (pathname === "/signup" || pathname.startsWith("/signup/"))
  ) {
    return NextResponse.redirect(new URL("/early-access", req.nextUrl.origin));
  }

  if (!isLoggedIn && !isPublicPath(pathname)) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)",
  ],
};
