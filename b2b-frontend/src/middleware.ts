import NextAuth from 'next-auth';

import { authConfig } from './auth.config';

// Re-export NextAuth's auth function as middleware. It invokes the
// `authorized` callback from authConfig on every matched request.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protect the whole admin subtree. NextAuth handles login redirects
  // via authConfig.pages.signIn.
  matcher: ['/admin/:path*']
};
