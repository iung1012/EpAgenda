import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@/lib/api/client';
import { api } from '@/lib/api/client';

type AppRole = 'admin' | 'gerente' | 'colaborador' | 'filmmaker' | 'designer';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  birthday: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isAdminOrManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let revision = 0;
    const applySession = async (next: Session | null) => {
      const current = ++revision;
      setLoading(true);
      setSession(next);
      setUser(next?.user ?? null);
      setProfile(null);
      setRole(null);
      if (next?.user) {
        const [profileResult, roleResult] = await Promise.all([
          api.from('profiles').select('*').eq('user_id', next.user.id).single(),
          api.from('user_roles').select('role').eq('user_id', next.user.id)
        ]);
        if (disposed || current !== revision) return;
        setProfile(profileResult.data);
        const precedence: AppRole[] = ['admin', 'gerente', 'filmmaker', 'designer', 'colaborador'];
        setRole(precedence.find(value => roleResult.data?.some(row => row.role === value)) ?? null);
      }
      if (!disposed && current === revision) setLoading(false);
    };
    const { data: { subscription } } = api.auth.onAuthStateChange((_event, next) => { void applySession(next); });
    const initialRevision = revision;
    void api.auth.getSession().then(({ data }) => {
      if (!disposed && revision === initialRevision) void applySession(data.session);
    });
    return () => { disposed = true; revision++; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await api.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await api.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const isAdmin = role === 'admin';
  const isManager = role === 'gerente';
  const isAdminOrManager = isAdmin || isManager;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      loading,
      signIn,
      signOut,
      isAdmin,
      isManager,
      isAdminOrManager
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
