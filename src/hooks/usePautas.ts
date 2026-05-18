import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Pauta {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePautas() {
  const [pautas, setPautas] = useState<Pauta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPautas = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('pautas')
      .select('*')
      .order('created_at', { ascending: false });
    setPautas((data || []) as Pauta[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPautas();
  }, [fetchPautas]);

  return { pautas, isLoading, refetch: fetchPautas };
}
