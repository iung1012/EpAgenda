import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from '@/hooks/use-toast';

const notificationSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório').max(100, 'Título muito longo'),
  message: z.string().trim().min(1, 'Mensagem é obrigatória').max(500, 'Mensagem muito longa'),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface NotificationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationFormDialog({ open, onOpenChange }: NotificationFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createNotification } = useNotifications();

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      message: '',
    },
  });

  const onSubmit = async (data: NotificationFormData) => {
    setIsSubmitting(true);
    const { error } = await createNotification(data.title, data.message);
    setIsSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar notificação',
        description: typeof error === 'string' ? error : 'Tente novamente',
      });
    } else {
      toast({ title: 'Notificação enviada para todos!' });
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Notificação</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título da notificação" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Escreva a mensagem..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : 'Enviar para todos'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
