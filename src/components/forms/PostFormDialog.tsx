import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(120),
  caption: z.string().max(2000).optional(),
  scheduled_date: z.string().min(1, 'Data é obrigatória'),
  client_id: z.string().optional(),
  platform: z.enum(['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'outro']),
  status: z.enum(['agendado', 'postado', 'atrasado']),
  media_url: z.string().optional(),
  link: z.string().optional(),
});

export type PostFormValues = z.infer<typeof schema>;

interface Client { id: string; name: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PostFormValues) => Promise<void>;
  defaultValues?: Partial<PostFormValues>;
  clients: Client[];
  isEditing?: boolean;
  isLoading?: boolean;
}

export function PostFormDialog({
  open, onOpenChange, onSubmit, defaultValues, clients, isEditing, isLoading,
}: Props) {
  const form = useForm<PostFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '', caption: '', scheduled_date: '', client_id: '',
      platform: 'instagram', status: 'agendado', media_url: '', link: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: '', caption: '', scheduled_date: '', client_id: '',
        platform: 'instagram', status: 'agendado', media_url: '', link: '',
        ...defaultValues,
      });
    }
  }, [open, defaultValues, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Postagem' : 'Nova Postagem'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl><Input placeholder="Ex: Reels lançamento produto" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="scheduled_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data prevista *</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="postado">Postado</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="client_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="platform" render={({ field }) => (
                <FormItem>
                  <FormLabel>Plataforma</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="caption" render={({ field }) => (
              <FormItem>
                <FormLabel>Legenda</FormLabel>
                <FormControl><Textarea rows={3} placeholder="Texto da postagem" {...field} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="link" render={({ field }) => (
              <FormItem>
                <FormLabel>Link da postagem</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} /></FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
