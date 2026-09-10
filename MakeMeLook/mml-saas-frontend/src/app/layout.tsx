import { useState, useCallback, type FC } from 'react';
import { Outlet } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/widgets/sidebar';
import { Header } from '@/widgets/header';
import { cn } from '@/lib/utils';

const STORAGE_KEY_COLLAPSED = 'sidebar-collapsed';

const getStoredCollapsed = (): boolean =>
  localStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true';

export const AppLayout: FC = () => {
  const [collapsed, setCollapsed] = useState(getStoredCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_COLLAPSED, String(next));
      return next;
    });
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-svh overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        </div>

        {/* Mobile sidebar (Sheet) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-60 p-0"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar collapsed={false} onToggleCollapse={closeMobile} />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMobileMenuToggle={toggleMobile} />
          <main className={cn('flex-1 overflow-y-auto p-6')}>
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
};
