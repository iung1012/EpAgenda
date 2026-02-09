import { useState, useEffect, useCallback, useRef } from 'react';

export interface Holiday {
  date: string; // "YYYY-MM-DD"
  name: string;
  type: string;
}

const cache: Record<number, Holiday[]> = {};

export function useHolidays(year: number) {
  const [holidays, setHolidays] = useState<Holiday[]>(cache[year] || []);
  const [isLoading, setIsLoading] = useState(!cache[year]);

  useEffect(() => {
    if (cache[year]) {
      setHolidays(cache[year]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch holidays');
        return res.json();
      })
      .then((data: Holiday[]) => {
        cache[year] = data;
        setHolidays(data);
      })
      .catch(err => {
        console.error('Error fetching holidays:', err);
        setHolidays([]);
      })
      .finally(() => setIsLoading(false));
  }, [year]);

  const getHolidayForDate = useCallback((dateStr: string) => {
    return holidays.find(h => h.date === dateStr) || null;
  }, [holidays]);

  return { holidays, isLoading, getHolidayForDate };
}
