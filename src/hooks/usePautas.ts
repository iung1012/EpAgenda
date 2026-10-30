import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';

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
    const { data } = await api
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
