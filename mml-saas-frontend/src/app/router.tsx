import { createBrowserRouter, Navigate } from 'react-router-dom';
import {
  ProtectedRoute,
  GuestRoute,
  PendingRoute,
} from '@/features/auth/protected-route';
import { AppLayout } from './layout';
import { detectLocale } from '@/shared/lib/locale';

const localeRoutes = [
  {
    path: 'terms',
    lazy: () => import('@/pages/legal/terms'),
  },
  {
    path: 'privacy',
    lazy: () => import('@/pages/legal/privacy'),
  },
  {
    path: 'personal-data-policy',
    lazy: () => import('@/pages/legal/personal-data-policy'),
  },
  {
    element: <GuestRoute />,
    children: [
      {
        path: 'auth/login',
        lazy: () => import('@/pages/auth/login'),
      },
      {
        path: 'auth/register',
        lazy: () => import('@/pages/auth/register'),
      },
      {
        path: 'auth/password-reset',
        lazy: () => import('@/pages/auth/password-reset'),
      },
    ],
  },
  {
    element: <PendingRoute />,
    children: [
      {
        path: 'auth/verify-email',
        lazy: () => import('@/pages/auth/verify-email'),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            lazy: () => import('@/pages/dashboard'),
          },
          {
            path: 'projects',
            lazy: () => import('@/pages/projects'),
          },
          {
            path: 'projects/new',
            lazy: () => import('@/pages/projects/new'),
          },
          // Project layout — shows tab navigation for all main project sections
          {
            path: 'projects/:id',
            lazy: () => import('@/pages/projects/[id]/_layout'),
            children: [
              {
                index: true,
                lazy: () => import('@/pages/projects/[id]'),
              },
              {
                path: 'products',
                lazy: () => import('@/pages/projects/[id]/products'),
              },
              {
                path: 'groups',
                lazy: () => import('@/pages/projects/[id]/groups'),
              },
              {
                path: 'widget',
                lazy: () => import('@/pages/projects/[id]/widget'),
              },
              {
                path: 'leads',
                lazy: () => import('@/pages/projects/[id]/leads'),
              },
              {
                path: 'analytics',
                lazy: () => import('@/pages/projects/[id]/analytics'),
              },
              {
                path: 'installation',
                lazy: () => import('@/pages/projects/[id]/installation'),
              },
              {
                path: 'settings',
                lazy: () => import('@/pages/projects/[id]/settings'),
              },
              {
                path: 'products/import',
                lazy: () => import('@/pages/projects/[id]/products/import'),
              },
              {
                path: 'products/new',
                lazy: () => import('@/pages/projects/[id]/products/new'),
              },
              {
                path: 'products/:productId/edit',
                lazy: () => import('@/pages/projects/[id]/products/new'),
              },
            ],
          },
          // Detail pages — no tab navigation
          {
            path: 'projects/:id/leads/:leadId',
            lazy: () => import('@/pages/projects/[id]/leads/[leadId]'),
          },
          {
            path: 'profile',
            lazy: () => import('@/pages/profile'),
          },
          {
            path: 'profile/security',
            lazy: () => import('@/pages/profile/security'),
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter([
  // Root redirect: / → /:locale/
  {
    path: '/',
    element: <Navigate to={`/${detectLocale()}/`} replace />,
  },
  // All routes under /:locale
  {
    path: '/:locale',
    children: localeRoutes,
  },
]);
