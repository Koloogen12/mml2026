import type { FC } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuthStore } from './auth-store';

const Spinner: FC = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function useAuthGuard():
  | { loading: true }
  | { loading: false; authenticated: boolean; pending: boolean } {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  if (isLoading) return { loading: true };
  const pending = isAuthenticated && user?.status === 'pending_verification';
  return { loading: false, authenticated: isAuthenticated, pending };
}

function useLocalePrefix(): string {
  const { locale } = useParams<{ locale: string }>();
  return `/${locale ?? 'en'}`;
}

export const ProtectedRoute: FC = () => {
  const auth = useAuthGuard();
  const lp = useLocalePrefix();
  if (auth.loading) return <Spinner />;
  if (!auth.authenticated) return <Navigate to={`${lp}/auth/login`} replace />;
  if (auth.pending) return <Navigate to={`${lp}/auth/verify-email`} replace />;
  return <Outlet />;
};

export const GuestRoute: FC = () => {
  const auth = useAuthGuard();
  const lp = useLocalePrefix();
  if (auth.loading) return <Spinner />;
  if (auth.authenticated) return <Navigate to={`${lp}/`} replace />;
  return <Outlet />;
};

export const PendingRoute: FC = () => {
  const auth = useAuthGuard();
  const lp = useLocalePrefix();
  if (auth.loading) return <Spinner />;
  if (!auth.authenticated) return <Navigate to={`${lp}/auth/login`} replace />;
  if (!auth.pending) return <Navigate to={`${lp}/`} replace />;
  return <Outlet />;
};
