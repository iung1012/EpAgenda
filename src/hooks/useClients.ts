import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomLink {
  name: string;
  url: string;
}

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
  custom_links: CustomLink[];
}

// Lightweight type for components that only need id + name (e.g. selects/dropdowns)
export interface MinimalClient {
  id: string;
  name: string;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

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
      const mappedClients: Client[] = data.map((c) => ({
        ...c,
        color_palette: Array.isArray(c.color_palette) ? (c.color_palette as string[]) : [],
        social_links:
          typeof c.social_links === 'object' && c.social_links !== null
            ? (c.social_links as Record<string, string>)
            : {},
        custom_links: Array.isArray(c.custom_links)
          ? (c.custom_links as unknown as CustomLink[])
          : [],
      }));
      setClients(mappedClients);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return { clients, isLoading, error, refetch: fetchClients };
}

// Dedicated hook for components that only need id + name — avoids fetching unused fields
export function useMinimalClients() {
  const [clients, setClients] = useState<MinimalClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    if (data) setClients(data as MinimalClient[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return { clients, isLoading, error, refetch: fetchClients };
}
