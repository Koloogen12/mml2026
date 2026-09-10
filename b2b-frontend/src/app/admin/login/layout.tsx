// Nested layout for /admin/login — intentionally BARE so the login page
// does not render inside the authenticated <AdminShell>. The parent
// src/app/admin/layout.tsx still wraps this with the SessionProvider and
// .admin-root container (for Tailwind + CSS variables).

export default function LoginLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
