import { handlers } from '@/auth';

// NextAuth v5 catch-all handler: exposes /api/auth/signin, /signout,
// /callback/credentials, /session etc. Used by the client-side signIn()
// from 'next-auth/react' on the login form.
export const { GET, POST } = handlers;
