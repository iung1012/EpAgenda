import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Equipment {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export function useEquipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('equipment')
      .select('*')
      .order('name');

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    if (data) {
      setEquipment(data as Equipment[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  return {
    equipment,
    isLoading,
    error,
    refetch: fetchEquipment,
  };
}
