import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(120),
  description: z.string().max(1000).optional(),
  client_id: z.string().optional(),
});

export type PautaFormValues = z.infer<typeof schema>;

interface Client { id: string; name: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PautaFormValues) => Promise<void>;
  defaultValues?: Partial<PautaFormValues>;
  clients: Client[];
  isEditing?: boolean;
  isLoading?: boolean;
}

export function PautaFormDialog({ open, onOpenChange, onSubmit, defaultValues, clients, isEditing, isLoading }: Props) {
  const form = useForm<PautaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', client_id: '' },
  });

  useEffect(() => {
    if (open) form.reset({ title: '', description: '', client_id: '', ...defaultValues });
  }, [open, defaultValues, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Pauta' : 'Nova Pauta'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl><Input placeholder="Ex: Campanha de Natal" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
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
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
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
