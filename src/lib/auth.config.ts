import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe portion of the NextAuth config (no Prisma, no bcrypt) so the
 * middleware can decode the JWT session without a database connection.
 */
export const authConfig = {
  // Allow localhost / reverse-proxy hosts; required for Auth.js v5 session in middleware.
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
  },
  providers: [],
} satisfies NextAuthConfig;
