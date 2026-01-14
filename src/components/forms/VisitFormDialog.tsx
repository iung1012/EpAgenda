import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const visitSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Máximo 100 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  location: z.string().max(200, 'Máximo 200 caracteres').optional(),
  visit_date: z.string().min(1, 'Data é obrigatória'),
  client_id: z.string().optional(),
  status: z.enum(['agendada', 'realizada', 'cancelada']),
  notes: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  equipment_ids: z.array(z.string()),
});

export type VisitFormValues = z.infer<typeof visitSchema>;

interface Client {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
}

interface VisitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: VisitFormValues) => Promise<void>;
  defaultValues?: Partial<VisitFormValues>;
  clients: Client[];
  equipment: Equipment[];
  isEditing?: boolean;
  isLoading?: boolean;
}

export function VisitFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  clients,
  equipment,
  isEditing = false,
  isLoading = false,
}: VisitFormDialogProps) {
  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      visit_date: '',
      client_id: '',
      status: 'agendada',
      notes: '',
      equipment_ids: [],
    },
  });

  useEffect(() => {
    if (open && defaultValues) {
      form.reset({
        title: defaultValues.title || '',
        description: defaultValues.description || '',
        location: defaultValues.location || '',
        visit_date: defaultValues.visit_date || '',
        client_id: defaultValues.client_id || '',
        status: defaultValues.status || 'agendada',
        notes: defaultValues.notes || '',
        equipment_ids: defaultValues.equipment_ids || [],
      });
    } else if (open && !defaultValues) {
      form.reset({
        title: '',
        description: '',
        location: '',
        visit_date: '',
        client_id: '',
        status: 'agendada',
        notes: '',
        equipment_ids: [],
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = async (data: VisitFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Visita' : 'Nova Visita'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações da visita' : 'Preencha os dados para agendar uma nova visita'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Título da visita" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="visit_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e Hora *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agendada">Agendada</SelectItem>
                        <SelectItem value="realizada">Realizada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Endereço ou local da visita" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes da visita" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="equipment_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Equipamentos</FormLabel>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-xl p-3 bg-muted/30">
                    {equipment.map((eq) => (
                      <FormField
                        key={eq.id}
                        control={form.control}
                        name="equipment_ids"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(eq.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, eq.id]);
                                  } else {
                                    field.onChange(field.value.filter((id) => id !== eq.id));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {eq.name}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionais" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
