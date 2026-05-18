import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PostStatus = 'agendado' | 'postado' | 'atrasado';

export interface Post {
  id: string;
  client_id: string | null;
  title: string;
  caption: string | null;
  scheduled_date: string;
  posted_at: string | null;
  status: PostStatus;
  platform: string;
  media_url: string | null;
  link: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('scheduled_date', { ascending: true });
    setPosts((data || []) as Post[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, isLoading, refetch: fetchPosts };
}
