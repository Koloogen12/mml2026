import type { FC } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  User,
  Shield,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import logoSvg from '@/shared/assets/logo-original.svg';

/** "M" hanger mark extracted from the full MakeMeLook logo SVG */
const LogoIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 26 19"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M24.078.381a2.46 2.46 0 0 0-2.917.545L7.506 14.204a.66.66 0 0 1-.632.003.66.66 0 0 1-.627-.258L4.628 12.547a2.46 2.46 0 0 0-2.905-.749 2.46 2.46 0 0 0-1.675 2.596l-.045 4.125 1.78.019.046-4.125a.66.66 0 0 1 .155-.49.66.66 0 0 1 .97-.047l1.619 1.643a2.46 2.46 0 0 0 3.498-.037L22.406 2.19a.66.66 0 0 1 .459-.237.66.66 0 0 1 .514.056.66.66 0 0 1 .34.822L23.746 18.75l1.78.019.174-15.919a2.46 2.46 0 0 0-.427-1.484 2.46 2.46 0 0 0-1.195-.985Z"
      fill="currentColor"
    />
  </svg>
);

interface NavItem {
  label: string;
  icon: FC<{ className?: string }>;
  to: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;

  const mainNav: NavItem[] = [
    { label: t(locale, 'nav.dashboard'), icon: LayoutDashboard, to: lp('/') },
    { label: t(locale, 'nav.projects'), icon: FolderKanban, to: lp('/projects') },
  ];

  const bottomNav: NavItem[] = [
    { label: t(locale, 'nav.profile'), icon: User, to: lp('/profile') },
    { label: t(locale, 'nav.security'), icon: Shield, to: lp('/profile/security') },
  ];

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200 overflow-hidden',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center',
          collapsed ? 'justify-center' : 'px-4',
        )}
      >
        {collapsed ? (
          <LogoIcon className="size-7" />
        ) : (
          <img src={logoSvg} alt="MakeMeLook" className="h-5" />
        )}
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {mainNav.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <Separator className="mx-2 w-auto bg-sidebar-border" />

      {/* Bottom navigation */}
      <nav className="px-2 py-2 space-y-1">
        {bottomNav.map((item) => (
          <SidebarLink key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-3">
        <button
          onClick={onToggleCollapse}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? (
            <ChevronsRight className="size-5 shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="size-5 shrink-0" />
              <span className="truncate">{t(locale, 'nav.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

const SidebarLink: FC<{ item: NavItem; collapsed: boolean }> = ({
  item,
  collapsed,
}) => {
  const Icon = item.icon;

  const linkContent = (
    <>
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </>
  );

  const linkClass = (isActive: boolean) =>
    cn(
      'group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      collapsed && 'justify-center',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
    );

  const activeIndicator = (
    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-sidebar-primary" />
  );

  const navLink = (
    <NavLink to={item.to} end className={({ isActive }) => linkClass(isActive)}>
      {({ isActive }) => (
        <>
          {isActive && activeIndicator}
          {linkContent}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{navLink}</div>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return navLink;
};
