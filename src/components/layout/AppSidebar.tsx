import { 
  Building2, 
  Users, 
  Calendar, 
  CheckSquare, 
  LayoutDashboard,
  Settings,
  LogOut,
  Video,
  Film,
  Package,
  FileText
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

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
      case 'admin': return 'Admin';
      case 'gerente': return 'Gerente';
      case 'colaborador': return 'Colaborador';
      case 'filmmaker': return 'Filmmaker';
      case 'designer': return 'Designer';
      default: return '';
    }
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-start">
          <img 
            src={logo} 
            alt="EP Mídias" 
            className={collapsed ? "h-12 w-auto" : "h-20 w-auto"}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdminOrManager && (
          <>
            <Separator className="my-2" />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink 
                          to={item.url}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {(isFilmmaker || isAdminOrManager) && (
          <>
            <Separator className="my-2" />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filmmakerNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink 
                          to={item.url}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Separator className="mb-3" />
        <NavLink 
          to="/profile"
          className="flex items-center gap-3 rounded-lg hover:bg-sidebar-accent transition-colors p-1 -m-1"
          activeClassName="bg-sidebar-accent"
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {profile?.full_name ? getInitials(profile.full_name) : 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{getRoleBadge(role)}</p>
            </div>
          )}
        </NavLink>
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start gap-2 mt-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
