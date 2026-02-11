import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Trash2, MessageCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { user } = useAuth();
  const { profiles, getProfileName } = useProfiles();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);

  const filteredProfiles = useMemo(() => {
    if (!mentionSearch) return profiles;
    const search = mentionSearch.toLowerCase();
    return profiles.filter(p => p.full_name.toLowerCase().includes(search));
  }, [profiles, mentionSearch]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data as Comment[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchComments();
    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  // Extract mentioned user_ids from content
  const extractMentionedUserIds = (content: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const ids: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      ids.push(match[2]);
    }
    return ids;
  };

  const notifyMentionedUsers = async (content: string, authorName: string) => {
    const mentionedIds = extractMentionedUserIds(content);
    if (mentionedIds.length === 0 || !user) return;

    // Clean display content (remove mention markup)
    const displayContent = content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');

    for (const userId of mentionedIds) {
      if (userId === user.id) continue; // don't notify self
      await supabase.from('notifications').insert({
        title: `💬 ${authorName} mencionou você`,
        message: `Em um comentário de tarefa: "${displayContent.substring(0, 100)}${displayContent.length > 100 ? '...' : ''}"`,
        created_by: user.id,
      });
    }
  };

  const handleSend = async () => {
    if (!newComment.trim() || !user) return;

    setIsSending(true);
    const content = newComment.trim();
    const { error } = await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: user.id,
      content,
    });

    if (error) {
      toast.error('Erro ao enviar comentário');
    } else {
      const authorName = getProfileName(user.id) || 'Alguém';
      await notifyMentionedUsers(content, authorName);
      setNewComment('');
    }
    setIsSending(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
    if (error) toast.error('Erro ao excluir comentário');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(value);

    // Check if we're in a mention context
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      // Only show if @ is at start or preceded by space, and no space in search
      const charBeforeAt = atIndex > 0 ? value[atIndex - 1] : ' ';
      if ((charBeforeAt === ' ' || charBeforeAt === '\n' || atIndex === 0) && !/\s/.test(textAfterAt)) {
        setShowMentions(true);
        setMentionSearch(textAfterAt);
        setMentionStartPos(atIndex);
        setMentionIndex(0);
        return;
      }
    }

    setShowMentions(false);
    setMentionSearch('');
    setMentionStartPos(null);
  };

  const insertMention = (profile: { user_id: string; full_name: string }) => {
    if (mentionStartPos === null) return;

    const before = newComment.substring(0, mentionStartPos);
    const cursorPos = textareaRef.current?.selectionStart ?? newComment.length;
    const after = newComment.substring(cursorPos);

    const mentionText = `@[${profile.full_name}](${profile.user_id}) `;
    const updated = before + mentionText + after;

    setNewComment(updated);
    setShowMentions(false);
    setMentionSearch('');
    setMentionStartPos(null);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + mentionText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredProfiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => Math.min(i + 1, filteredProfiles.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredProfiles[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render comment content with highlighted mentions
  const renderContent = (content: string) => {
    const parts = content.split(/(@\[([^\]]+)\]\([^)]+\))/g);
    const elements: React.ReactNode[] = [];

    let i = 0;
    while (i < parts.length) {
      const part = parts[i];
      // Check if this is a full mention match
      const mentionMatch = part?.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
      if (mentionMatch) {
        elements.push(
          <span key={i} className="font-semibold text-primary">
            @{mentionMatch[1]}
          </span>
        );
        i += 3; // skip the capture groups
      } else {
        if (part) elements.push(<span key={i}>{part}</span>);
        i++;
      }
    }

    return elements;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        <span>Comentários ({comments.length})</span>
      </div>

      {/* Comments list */}
      <div
        ref={scrollRef}
        className={cn(
          "space-y-3 overflow-y-auto pr-1",
          comments.length > 3 ? "max-h-[200px]" : ""
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => {
              const authorName = getProfileName(comment.user_id);
              const isOwn = comment.user_id === user?.id;

              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group flex gap-2.5"
                >
                  <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                      {getInitials(authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate">
                        {authorName || 'Usuário'}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(comment.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                      {isOwn && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-foreground/90 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
                      {renderContent(comment.content)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input with mention dropdown */}
      <div className="relative">
        {/* Mention dropdown */}
        <AnimatePresence>
          {showMentions && filteredProfiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-[150px] overflow-y-auto"
            >
              {filteredProfiles.slice(0, 6).map((profile, idx) => (
                <button
                  key={profile.user_id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors",
                    idx === mentionIndex && "bg-accent"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(profile);
                  }}
                  onMouseEnter={() => setMentionIndex(idx)}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{profile.full_name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            placeholder="Escreva um comentário... Use @ para mencionar"
            value={newComment}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[36px] max-h-[80px] text-xs resize-none rounded-lg"
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 rounded-lg shrink-0"
            onClick={handleSend}
            disabled={!newComment.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
