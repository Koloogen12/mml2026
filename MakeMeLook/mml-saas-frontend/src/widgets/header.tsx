import React from 'react';
import type { FC } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, LogOut, User, Shield, ChevronRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useAuthStore } from '@/features/auth/auth-store';
import { useBreadcrumbs } from '@/shared/lib/use-breadcrumbs';
import { useLocale, type Locale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { useLocation } from 'react-router-dom';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export const Header: FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const navigate = useNavigate();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const location = useLocation();
  const breadcrumbs = useBreadcrumbs();

  const switchLocale = (newLocale: Locale) => {
    const path = location.pathname.replace(/^\/(en|ru)/, `/${newLocale}`);
    navigate(path + location.search, { replace: true });
  };

  const handleLogout = async () => {
    try {
      const { authApi } = await import('@/shared/api/auth');
      await authApi.logout();
    } catch {
      // Best-effort — clear local state regardless
    }
    clearAuth();
    navigate(lp('/auth/login'), { replace: true });
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden size-8"
        onClick={onMobileMenuToggle}
      >
        <Menu className="size-5" />
        <span className="sr-only">{t(locale, 'nav.toggleMenu')}</span>
      </Button>

      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {index < breadcrumbs.length - 1 && crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="size-4" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Language Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Globe className="size-4" />
            {locale.toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={() => switchLocale('en')}>
            {locale === 'en' ? '✓ ' : ''}English
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => switchLocale('ru')}>
            {locale === 'ru' ? '✓ ' : ''}Русский
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent transition-colors outline-none">
            <Avatar size="sm">
              <AvatarImage
                src={user?.avatar_url || undefined}
                className="object-cover"
              />
              <AvatarFallback className="text-[10px]">
                {user?.name ? getInitials(user.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
              {user?.name ?? 'User'}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => navigate(lp('/profile'))}>
            <User className="mr-2 size-4" />
            {t(locale, 'nav.profile')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(lp('/profile/security'))}>
            <Shield className="mr-2 size-4" />
            {t(locale, 'nav.security')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 size-4" />
            {t(locale, 'nav.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
