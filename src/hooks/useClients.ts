import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  segment: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  color_palette: string[];
  social_links: Record<string, string>;
  google_drive_link: string | null;
  trello_link: string | null;
  canva_link: string | null;
  notes: string | null;
}

interface UseClientsOptions {
  minimal?: boolean; // Only fetch id and name
}

export function useClients(options: UseClientsOptions = {}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (options.minimal) {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      if (data) {
      const mappedClients = data.map(c => ({
          ...c,
          logo_url: null,
          segment: null,
          contact_name: null,
          contact_email: null,
          contact_phone: null,
          color_palette: [],
          social_links: {},
          google_drive_link: null,
          trello_link: null,
          canva_link: null,
          notes: null,
        })) as Client[];
        setClients(mappedClients);
      }
    } else {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        const mappedClients = data.map(c => ({
          ...c,
          color_palette: Array.isArray(c.color_palette) ? (c.color_palette as string[]) : [],
          social_links: typeof c.social_links === 'object' && c.social_links !== null
            ? c.social_links as Record<string, string>
            : {},
        })) as Client[];
        setClients(mappedClients);
      }
    }
    setIsLoading(false);
  }, [options.minimal]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return { clients, isLoading, error, refetch: fetchClients };
}
