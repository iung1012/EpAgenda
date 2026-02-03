import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TaskPriority } from './useTasks';

export interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  link: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Helper to access task_templates table (not yet in generated types)
const taskTemplatesTable = () => supabase.from('task_templates' as any);

export function useTaskTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await taskTemplatesTable()
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTemplates((data || []) as unknown as TaskTemplate[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = useCallback(async (template: {
    title: string;
    description?: string;
    priority: TaskPriority;
    link?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'Usuário não autenticado' } };

    const { error } = await taskTemplatesTable()
      .insert({
        title: template.title,
        description: template.description || null,
        priority: template.priority,
        link: template.link || null,
        created_by: user.id,
      });

    if (!error) {
      fetchTemplates();
    }
    return { error };
  }, [fetchTemplates]);

  const updateTemplate = useCallback(async (id: string, template: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    link?: string;
  }) => {
    const { error } = await taskTemplatesTable()
      .update(template)
      .eq('id', id);

    if (!error) {
      fetchTemplates();
    }
    return { error };
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await taskTemplatesTable()
      .delete()
      .eq('id', id);

    if (!error) {
      fetchTemplates();
    }
    return { error };
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
