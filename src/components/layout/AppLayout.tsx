import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: AppLayoutProps) {
  return (
    <SidebarInset className="flex-1 flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
        <SidebarTrigger className="-ml-1 hover:bg-muted/50 transition-colors" />
        <div className="flex-1" />
      </header>
      <main className="flex-1">
        {children}
      </main>
    </SidebarInset>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <LayoutContent>{children}</LayoutContent>
      </div>
    </SidebarProvider>
  );
}
