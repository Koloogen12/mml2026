import type { NextAuthConfig } from 'next-auth';

// Edge-safe NextAuth config. Contains only declarations that can run in the
// middleware edge runtime — no Prisma, no bcrypt, no Node-only imports.
//
// The full config (with Credentials provider that reads from the DB) lives
// in `./auth.ts` and is used by the route handler + server components.

export const authConfig = {
  // Приложение отдаётся сразу на двух именах (b2b.makemelook.ai и
  // makemelook.tech), поэтому «правильный» адрес — тот, по которому пришёл
  // запрос, а не зашитый в переменную окружения.
  trustHost: true,
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

      if (isOnAdmin && !isLoggedIn) {
        // Редирект собираем сами от адреса запроса, а не возвращаем false.
        //
        // На false NextAuth строит адрес страницы входа от своей базы —
        // NEXTAUTH_URL. На проде там стоит https://makemelook.ai (это ДРУГОЙ
        // продукт, платформа покупателя), и человек, набравший
        // b2b.makemelook.ai/admin, улетал на чужой сайт и не мог войти вообще.
        // От nextUrl такое невозможно: на каком домене открыли админку, на том
        // и останемся.
        const login = new URL('/admin/login', nextUrl);
        login.searchParams.set('callbackUrl', `${nextUrl.pathname}${nextUrl.search}`);
        return Response.redirect(login);
      }

      return true;
    }
  },
  // Providers are attached in `./auth.ts` (they need DB access).
  providers: []
} satisfies NextAuthConfig;
