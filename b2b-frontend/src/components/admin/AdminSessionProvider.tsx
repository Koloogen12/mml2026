'use client';

import { SessionProvider, type SessionProviderProps } from 'next-auth/react';

// Thin client-boundary wrapper around NextAuth's SessionProvider so we can
// mount it from a Server Component (our admin/layout.tsx) without
// tripping the "you're using a client API from a server component" rule
// some versions of NextAuth v5 enforce. Also prevents a full-page client
// hydration of everything above this component.

export function AdminSessionProvider({
  children,
  session
}: {
  children: React.ReactNode;
  session: SessionProviderProps['session'];
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
