import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { ErrorState } from "@/components/layout/ErrorState";
import { TableRowSkeleton } from "@/components/layout/CardSkeleton";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { useEquipment, Equipment as EquipmentType } from "@/hooks/useEquipment";

export default function Equipment() {
  const { toast } = useToast();
  const { equipment, isLoading, error, refetch } = useEquipment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: '', name: '' });
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEquipment) {
      const { error } = await supabase
        .from("equipment")
        .update({
          name: form.name,
          description: form.description || null,
        })
        .eq("id", editingEquipment.id);

      if (error) {
        toast({
          title: "Erro ao atualizar equipamento",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Equipamento atualizado com sucesso!" });
    } else {
      const { error } = await supabase.from("equipment").insert({
        name: form.name,
        description: form.description || null,
      });

      if (error) {
        toast({
          title: "Erro ao criar equipamento",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Equipamento criado com sucesso!" });
    }

    setDialogOpen(false);
    setEditingEquipment(null);
    setForm({ name: "", description: "" });
    refetch();
  };

  const handleEdit = (equip: EquipmentType) => {
    setEditingEquipment(equip);
    setForm({
      name: equip.name,
      description: equip.description || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("equipment").delete().eq("id", confirmDialog.id);

    if (error) {
      toast({
        title: "Erro ao excluir equipamento",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Equipamento excluído com sucesso!" });
      refetch();
    }
    
    setConfirmDialog({ open: false, id: '', name: '' });
  };

  const openDeleteDialog = (id: string, name: string) => {
    setConfirmDialog({ open: true, id, name });
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingEquipment(null);
      setForm({ name: "", description: "" });
    }
  };

  if (error) {
    return (
      <AppLayout>
        <div className="animate-in">
          <PageHeader
            title="Equipamentos"
            description="Gerencie os equipamentos disponíveis para as visitas"
          />
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <ErrorState onRetry={refetch} />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-in">
        <PageHeader
          title="Equipamentos"
          description="Gerencie os equipamentos disponíveis para as visitas"
          action={
            <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingEquipment ? "Editar Equipamento" : "Novo Equipamento"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex: Canon R5"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Detalhes sobre o equipamento"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleDialogClose(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingEquipment ? "Salvar" : "Adicionar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(4)].map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </div>
          ) : equipment.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum equipamento cadastrado"
              description="Adicione equipamentos para vincular às visitas de filmagem"
            />
          ) : (
            <div className="divide-y divide-border/50">
              {equipment.map((equip) => (
                <div
                  key={equip.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{equip.name}</h3>
                    {equip.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {equip.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(equip)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(equip.id, equip.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          {equipment.length} {equipment.length === 1 ? 'equipamento' : 'equipamentos'} cadastrado{equipment.length !== 1 ? 's' : ''}
        </p>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
          title="Excluir equipamento"
          description={`Tem certeza que deseja excluir "${confirmDialog.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          onConfirm={handleDelete}
          variant="destructive"
        />
      </div>
    </AppLayout>
  );
}
