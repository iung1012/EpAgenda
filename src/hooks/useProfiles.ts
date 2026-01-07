import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'gerente' | 'colaborador' | 'filmmaker' | 'designer';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
}

export interface ProfileWithRole extends Profile {
  role: AppRole;
}

interface UseProfilesOptions {
  withRoles?: boolean;
}

export function useProfiles(options: UseProfilesOptions = {}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesWithRoles, setProfilesWithRoles] = useState<ProfileWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, avatar_url, phone')
      .order('full_name');

    if (profilesError) {
      setError(profilesError.message);
      setIsLoading(false);
      return;
    }

    if (profilesData) {
      setProfiles(profilesData as Profile[]);

      if (options.withRoles) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (roles) {
          const membersWithRoles = profilesData.map((profile) => {
            const userRole = roles.find((r) => r.user_id === profile.user_id);
            return {
              ...profile,
              role: (userRole?.role || 'colaborador') as AppRole,
            };
          });
          setProfilesWithRoles(membersWithRoles);
        }
      }
    }
    setIsLoading(false);
  }, [options.withRoles]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const getProfileName = useCallback((userId: string | null) => {
    if (!userId) return null;
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || null;
  }, [profiles]);

  return {
    profiles,
    profilesWithRoles,
    isLoading,
    error,
    refetch: fetchProfiles,
    getProfileName,
  };
}
