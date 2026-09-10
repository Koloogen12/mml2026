import { useLocation, useParams } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export function useBreadcrumbs(): Breadcrumb[] {
  const location = useLocation();
  const { locale: localeParam } = useParams<{ locale: string }>();
  const locale = useLocale();
  const lp = (p: string) => `/${localeParam ?? 'en'}${p}`;

  // Strip locale prefix to get the logical path
  const raw = location.pathname;
  const path = localeParam ? raw.replace(`/${localeParam}`, '') || '/' : raw;

  // Dashboard
  if (path === '/') {
    return [{ label: t(locale, 'breadcrumbs.dashboard') }];
  }

  // Projects
  if (path === '/projects') {
    return [{ label: t(locale, 'breadcrumbs.projects') }];
  }

  // Projects/:id/*
  const projectMatch = path.match(/^\/projects\/([^/]+)(\/(.+))?$/);
  if (projectMatch) {
    const [, , , subPath] = projectMatch;
    const breadcrumbs: Breadcrumb[] = [
      { label: t(locale, 'breadcrumbs.projects'), href: lp('/projects') },
      { label: t(locale, 'breadcrumbs.project') },
    ];

    if (subPath) {
      // Projects/:id/widget
      if (subPath === 'widget') {
        breadcrumbs.push({ label: t(locale, 'breadcrumbs.widget') });
      }
      // Projects/:id/products
      else if (subPath === 'products') {
        breadcrumbs.push({ label: t(locale, 'breadcrumbs.products') });
      }
      // Projects/:id/leads
      else if (subPath === 'leads') {
        breadcrumbs.push({ label: t(locale, 'breadcrumbs.leads') });
      }
      // Projects/:id/leads/:leadId
      else if (subPath.startsWith('leads/')) {
        const leadsBase = raw.replace(/\/[^/]+$/, '');
        breadcrumbs.push({
          label: t(locale, 'breadcrumbs.leads'),
          href: leadsBase,
        });
        breadcrumbs.push({ label: t(locale, 'breadcrumbs.lead') });
      }
      // Projects/:id/installation
      else if (subPath === 'installation') {
        breadcrumbs.push({ label: t(locale, 'breadcrumbs.installation') });
      }
      // Projects/:id/analytics
      else if (subPath === 'analytics') {
        breadcrumbs.push({ label: t(locale, 'breadcrumbs.analytics') });
      }
    }

    return breadcrumbs;
  }

  // Profile
  if (path === '/profile') {
    return [{ label: t(locale, 'breadcrumbs.profile') }];
  }

  // Profile/Security
  if (path === '/profile/security') {
    return [
      { label: t(locale, 'breadcrumbs.profile'), href: lp('/profile') },
      { label: t(locale, 'breadcrumbs.security') },
    ];
  }

  // Fallback
  return [{ label: t(locale, 'breadcrumbs.dashboard'), href: lp('/') }];
}
