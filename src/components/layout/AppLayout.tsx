import { ReactNode } from 'react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { AppDock } from './AppDock';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-end gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
        <ThemeToggle />
        <NotificationBell />
      </header>
      <main className="pb-24 p-6">
        {children}
      </main>
      <AppDock />
    </div>
  );
}
