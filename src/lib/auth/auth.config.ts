import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config (no DB imports).
 * Used by middleware for JWT verification only.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    newUser: "/onboarding",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // Public routes - allow everyone
      const publicRoutes = ["/", "/sign-in", "/sign-up"];
      if (publicRoutes.some((r) => path === r || path.startsWith(r + "/"))) {
        return true;
      }

      // Everything else requires auth
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
