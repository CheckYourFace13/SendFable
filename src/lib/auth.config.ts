import type { NextAuthConfig } from "next-auth";
import { safeCallbackFromUrl } from "@/lib/safe-redirect";

/**
 * Edge-safe portion of the NextAuth config (no Prisma, no bcrypt) so the
 * middleware can decode the JWT session without a database connection.
 *
 * trustHost: production traffic only reaches the app through the Sendfable
 * Nginx site (server_name sendfable.com / www.sendfable.com), which overwrites
 * the Host and X-Forwarded-* headers. Requests with spoofed Host headers do
 * not route to this upstream, and NEXTAUTH_URL pins the canonical origin.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    /** Server-side post-auth redirect validation (magic links, OAuth-style flows). */
    redirect({ url, baseUrl }) {
      return baseUrl + safeCallbackFromUrl(url, baseUrl);
    },
  },
  providers: [],
} satisfies NextAuthConfig;
