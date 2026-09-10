import { auth } from '@/auth';
import { AdminSessionProvider } from '@/components/admin/AdminSessionProvider';

import './admin.css';

// Single layout for the /admin subtree. Applied BEFORE the route guards
// (middleware redirects unauthenticated users away from /admin/* except
// /admin/login, which has its own nested layout to skip the shell).
//
// This layout is a Server Component so we can read the session from the
// edge-rendered cookie without shipping auth code to the client.

export const metadata = {
  title: 'Админка — MakeMeLook',
  robots: { index: false, follow: false }
};

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <AdminSessionProvider session={session}>
      <div className="admin-root">{children}</div>
    </AdminSessionProvider>
  );
}
