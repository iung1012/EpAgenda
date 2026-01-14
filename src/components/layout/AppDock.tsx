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
  User
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dock, DockItem, DockLabel, DockIcon } from '@/components/ui/dock';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Clientes', url: '/clients', icon: Building2 },
  { title: 'Calendário', url: '/calendar', icon: Calendar },
  { title: 'Tarefas', url: '/tasks', icon: CheckSquare },
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

export function AppDock() {
  const { role, signOut, isAdminOrManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isFilmmaker = role === 'filmmaker';

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  const allItems = [
    ...mainNavItems,
    ...(isAdminOrManager ? adminNavItems : []),
    ...((isFilmmaker || isAdminOrManager) ? filmmakerNavItems : []),
    { title: 'Perfil', url: '/profile', icon: User },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <Dock 
        magnification={60} 
        distance={100}
        panelHeight={56}
      >
        {allItems.map((item) => (
          <DockItem 
            key={item.url}
            onClick={() => navigate(item.url)}
          >
            <DockLabel>{item.title}</DockLabel>
            <DockIcon>
              <div
                className={cn(
                  'flex items-center justify-center w-full h-full rounded-xl transition-colors',
                  isActive(item.url) 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                )}
              >
                <item.icon className="w-1/2 h-1/2" />
              </div>
            </DockIcon>
          </DockItem>
        ))}
        <DockItem onClick={signOut}>
          <DockLabel>Sair</DockLabel>
          <DockIcon>
            <div className="flex items-center justify-center w-full h-full rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
              <LogOut className="w-1/2 h-1/2" />
            </div>
          </DockIcon>
        </DockItem>
      </Dock>
    </div>
  );
}
