import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
}

interface NavigationItem {
  id: string;
  name: string;
}

export function useDriveFiles(rootFolderId?: string) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(rootFolderId || null);
  const [breadcrumbs, setBreadcrumbs] = useState<NavigationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFiles = useCallback(async (folderId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const targetFolderId = folderId || currentFolderId || rootFolderId;
      
      if (!targetFolderId) {
        setFiles([]);
        setLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('google-drive', {
        body: null,
        method: 'GET',
      });

      // Use fetch directly since invoke doesn't support query params well
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('Não autenticado');
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-drive?action=list&folderId=${encodeURIComponent(targetFolderId)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar arquivos');
      }

      const filesData = await response.json();
      setFiles(filesData);
      setCurrentFolderId(targetFolderId);
    } catch (err: any) {
      console.error('Error fetching drive files:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar arquivos',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, rootFolderId]);

  const navigateToFolder = useCallback(async (folder: DriveFile) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    await fetchFiles(folder.id);
  }, [fetchFiles]);

  const navigateBack = useCallback(async (index?: number) => {
    if (index !== undefined) {
      // Navigate to specific breadcrumb
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      const targetFolder = newBreadcrumbs[newBreadcrumbs.length - 1];
      setBreadcrumbs(newBreadcrumbs.slice(0, -1));
      setCurrentFolderId(targetFolder?.id || rootFolderId || null);
      await fetchFiles(targetFolder?.id || rootFolderId);
    } else if (breadcrumbs.length > 0) {
      // Go back one level
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      const targetFolder = newBreadcrumbs[newBreadcrumbs.length - 1];
      setBreadcrumbs(newBreadcrumbs);
      setCurrentFolderId(targetFolder?.id || rootFolderId || null);
      await fetchFiles(targetFolder?.id || rootFolderId);
    } else if (rootFolderId) {
      // Go to root
      setCurrentFolderId(rootFolderId);
      await fetchFiles(rootFolderId);
    }
  }, [breadcrumbs, rootFolderId, fetchFiles]);

  const navigateToRoot = useCallback(async () => {
    setBreadcrumbs([]);
    setCurrentFolderId(rootFolderId || null);
    if (rootFolderId) {
      await fetchFiles(rootFolderId);
    }
  }, [rootFolderId, fetchFiles]);

  const searchFiles = useCallback(async (query: string) => {
    if (!query.trim()) {
      await fetchFiles();
      return;
    }

    setLoading(true);
    setError(null);
    setSearchQuery(query);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('Não autenticado');
      }

      const targetFolderId = currentFolderId || rootFolderId;
      if (!targetFolderId) {
        throw new Error('Nenhuma pasta selecionada');
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/google-drive?action=search&folderId=${encodeURIComponent(targetFolderId)}&search=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar arquivos');
      }

      const filesData = await response.json();
      setFiles(filesData);
    } catch (err: any) {
      console.error('Error searching drive files:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Erro na busca',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, rootFolderId]);

  const clearSearch = useCallback(async () => {
    setSearchQuery('');
    await fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    currentFolderId,
    breadcrumbs,
    searchQuery,
    fetchFiles,
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    searchFiles,
    clearSearch,
    setRootFolderId: (id: string) => {
      setCurrentFolderId(id);
      setBreadcrumbs([]);
    },
  };
}
