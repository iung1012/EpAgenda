import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api/client';
import { startOfDay, endOfDay } from 'date-fns';

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

export function usePosts(date: Date) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId=useRef(0);
  const day = date.getTime();

  const fetchPosts = useCallback(async () => {
    const current=++requestId.current;
    setIsLoading(true);
    setError(null);
    const rows: Post[] = [];
    for(let offset=0;;offset+=1000){
      const {data,error:fetchError}=await api.from('posts').select('*').gte('scheduled_date',startOfDay(day).toISOString()).lte('scheduled_date',endOfDay(day).toISOString()).order('scheduled_date',{ascending:true}).order('id',{ascending:true}).range(offset,offset+999);
      if(current!==requestId.current)return;
      if(fetchError){setError(fetchError.message);setPosts([]);setIsLoading(false);return;}
      const batch=(data||[]) as Post[];rows.push(...batch);if(batch.length<1000)break;
    }
    setPosts(rows);
    setIsLoading(false);
  }, [day]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, isLoading, error, refetch: fetchPosts };
}
