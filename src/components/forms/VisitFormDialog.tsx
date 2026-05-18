import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Check, ChevronLeft, ChevronRight, Package, MapPin, Calendar as CalIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const visitSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Máximo 100 caracteres'),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  visit_date: z.string().min(1, 'Data é obrigatória'),
  client_id: z.string().optional(),
  status: z.enum(['agendada', 'realizada', 'cancelada']),
  notes: z.string().max(1000).optional(),
  equipment_ids: z.array(z.string()),
  assigned_to: z.string().min(1, 'Responsável é obrigatório'),
  delivery_deadline: z.string().min(1, 'Prazo de entrega é obrigatório'),
});

export type VisitFormValues = z.infer<typeof visitSchema>;

interface Client { id: string; name: string; }
interface Equipment { id: string; name: string; }
interface Profile { user_id: string; full_name: string; }

interface VisitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: VisitFormValues) => Promise<void>;
  defaultValues?: Partial<VisitFormValues>;
  clients: Client[];
  equipment: Equipment[];
  profiles: Profile[];
  isEditing?: boolean;
  isLoading?: boolean;
}

const empty: VisitFormValues = {
  title: '', description: '', location: '', visit_date: '',
  client_id: '', status: 'agendada', notes: '', equipment_ids: [],
  assigned_to: '', delivery_deadline: '',
};

export function VisitFormDialog({
  open, onOpenChange, onSubmit, defaultValues, clients, equipment, profiles,
  isEditing = false, isLoading = false,
}: VisitFormDialogProps) {
  const [step, setStep] = useState(0);
  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    if (open) {
      form.reset({ ...empty, ...(defaultValues || {}) });
      setStep(0);
    }
  }, [open, defaultValues, form]);

  const handleSubmit = async (data: VisitFormValues) => {
    await onSubmit(data);
    form.reset();
    setStep(0);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) { form.reset(); setStep(0); }
    onOpenChange(o);
  };

  const steps = [
    { id: 0, label: 'Visita', icon: CalIcon },
    { id: 1, label: 'Equipamentos', icon: Package },
    { id: 2, label: 'Concluir', icon: CheckCircle2 },
  ];

  const nextStep = async () => {
    if (step === 0) {
      const valid = await form.trigger(['title', 'visit_date', 'assigned_to', 'delivery_deadline']);
      if (!valid) return;
    }
    setStep(s => Math.min(2, s + 1));
  };

  const watched = form.watch();
  const selectedEquipment = equipment.filter(e => watched.equipment_ids?.includes(e.id));
  const selectedClient = clients.find(c => c.id === watched.client_id);
  const selectedAssignee = profiles.find(p => p.user_id === watched.assigned_to);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Visita' : 'Nova Visita'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações' : `Passo ${step + 1} de 3: ${steps[step].label}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-2">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === step;
            const isDone = idx < step;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isDone && "bg-emerald-500 text-white",
                  !isActive && !isDone && "bg-muted text-muted-foreground",
                )}>
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn("h-0.5 flex-1 mx-2", idx < step ? "bg-emerald-500" : "bg-muted")} />
                )}
              </div>
            );
          })}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">

            {step === 0 && (
              <>
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl><Input placeholder="Título da visita" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="visit_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e Hora *</FormLabel>
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
                          <SelectItem value="agendada">Agendada</SelectItem>
                          <SelectItem value="realizada">Realizada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="client_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local</FormLabel>
                    <FormControl><Input placeholder="Endereço ou local" {...field} /></FormControl>
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="assigned_to" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="delivery_deadline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo de entrega *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Textarea placeholder="Detalhes" rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
              </>
            )}

            {step === 1 && (
              <FormField control={form.control} name="equipment_ids" render={() => (
                <FormItem>
                  <FormLabel>Selecione os equipamentos</FormLabel>
                  <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto border rounded-xl p-3 bg-muted/30">
                    {equipment.length === 0 && (
                      <p className="text-xs text-muted-foreground col-span-2">Nenhum equipamento cadastrado.</p>
                    )}
                    {equipment.map(eq => (
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
                                  if (checked) field.onChange([...field.value, eq.id]);
                                  else field.onChange(field.value.filter(id => id !== eq.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">{eq.name}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </FormItem>
              )} />
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Título</p>
                    <p className="font-medium">{watched.title || '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><CalIcon className="h-3 w-3" />Data</p>
                      <p className="text-sm">{watched.visit_date || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="text-sm">{selectedClient?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Responsável</p>
                      <p className="text-sm">{selectedAssignee?.full_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Prazo de entrega</p>
                      <p className="text-sm">{watched.delivery_deadline || '—'}</p>
                    </div>
                  </div>
                  {watched.location && (
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Local</p>
                      <p className="text-sm">{watched.location}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />Equipamentos ({selectedEquipment.length})</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedEquipment.length === 0 ? (
                        <span className="text-sm text-muted-foreground italic">Nenhum</span>
                      ) : selectedEquipment.map(eq => (
                        <span key={eq.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-background border">
                          {eq.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações finais</FormLabel>
                    <FormControl><Textarea placeholder="Notas adicionais" rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <div>
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                {step < 2 ? (
                  <Button type="button" onClick={nextStep} className="gap-1">
                    Avançar <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading} className="gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Concluir e Criar'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
