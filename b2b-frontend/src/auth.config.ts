import type { NextAuthConfig } from 'next-auth';

// Edge-safe NextAuth config. Contains only declarations that can run in the
// middleware edge runtime — no Prisma, no bcrypt, no Node-only imports.
//
// The full config (with Credentials provider that reads from the DB) lives
// in `./auth.ts` and is used by the route handler + server components.

export const authConfig = {
  pages: {
    signIn: '/admin/login'
  },
  callbacks: {
    // Runs in middleware on every matched request. Returning `false` lets
    // NextAuth redirect unauthenticated users to the signIn page above.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isLogin = nextUrl.pathname === '/admin/login';

      if (isLogin) {
        // If already signed in, don't let them see the login form — bounce
        // them into the dashboard.
        if (isLoggedIn) {
          return Response.redirect(new URL('/admin', nextUrl));
        }
        return true;
      }

      if (isOnAdmin) {
        return isLoggedIn;
      }

      return true;
    }
  },
  // Providers are attached in `./auth.ts` (they need DB access).
  providers: []
} satisfies NextAuthConfig;
