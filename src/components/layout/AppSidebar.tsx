import { 
  Building2, 
  Users, 
  Calendar, 
  CheckSquare, 
  LayoutDashboard,
  LogOut,
  Video,
  Film,
  Package,
  FileText,
  Settings,
  ChevronRight
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Clientes', url: '/clients', icon: Building2 },
  { title: 'Calendário', url: '/calendar', icon: Calendar },
  { title: 'Tarefas', url: '/tasks', icon: CheckSquare },
  { title: 'Modelos', url: '/templates', icon: FileText },
];

const adminNavItems = [
  { title: 'Equipe', url: '/team', icon: Users },
  { title: 'Equipamentos', url: '/equipment', icon: Package },
  { title: 'Configurações', url: '/settings', icon: Settings },
];

const filmmakerNavItems = [
  { title: 'Visitas', url: '/filmmaker/visits', icon: Video },
  { title: 'Demandas', url: '/filmmaker/demands', icon: Film },
];

export function AppSidebar() {
  const { profile, role, signOut, isAdminOrManager } = useAuth();
  const isFilmmaker = role === 'filmmaker';
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'gerente': return 'Gerente';
      case 'colaborador': return 'Colaborador';
      case 'filmmaker': return 'Filmmaker';
      case 'designer': return 'Designer';
      default: return '';
    }
  };

  const renderNavItem = (item: typeof mainNavItems[0]) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild tooltip={item.title}>
        <NavLink 
          to={item.url} 
          end={item.url === '/'}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
            "text-sidebar-foreground/70 hover:text-sidebar-foreground",
            "hover:bg-sidebar-accent/80 transition-all duration-200"
          )}
          activeClassName="bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
        >
          <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border/50">
      {/* Logo Header */}
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center justify-center">
          <img 
            src={logo} 
            alt="EP Mídias" 
            className={cn(
              "w-auto transition-all duration-300",
              collapsed ? "h-10" : "h-16"
            )}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold mb-1">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {mainNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        {isAdminOrManager && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold mb-1">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {adminNavItems.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Filmmaker Navigation */}
        {(isFilmmaker || isAdminOrManager) && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold mb-1">
              Audiovisual
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {filmmakerNavItems.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with profile */}
      <SidebarFooter className="p-3 mt-auto">
        <div className="rounded-xl bg-sidebar-accent/50 p-1">
          <NavLink 
            to="/profile"
            className={cn(
              "flex items-center gap-3 rounded-lg p-2 transition-all duration-200",
              "hover:bg-sidebar-accent"
            )}
            activeClassName="bg-sidebar-accent"
          >
            <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-sidebar-border/50">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
                <p className="text-[11px] text-sidebar-foreground/50">{getRoleBadge(role)}</p>
              </div>
            )}
            {!collapsed && (
              <ChevronRight className="h-4 w-4 text-sidebar-foreground/30 flex-shrink-0" />
            )}
          </NavLink>

          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start gap-2 mt-1 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg h-9 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair da conta
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}