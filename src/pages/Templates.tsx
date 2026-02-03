import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Pencil, Trash2, Copy } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTaskTemplates, TaskTemplate } from '@/hooks/useTaskTemplates';
import { useToast } from '@/hooks/use-toast';
import TemplateFormDialog from '@/components/forms/TemplateFormDialog';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { CardSkeleton } from '@/components/layout/CardSkeleton';

const priorityConfig = {
  baixa: { label: 'Baixa', variant: 'secondary' as const },
  media: { label: 'Média', variant: 'default' as const },
  alta: { label: 'Alta', variant: 'destructive' as const },
};

export default function Templates() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTaskTemplates();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TaskTemplate | null>(null);

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const handleEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleDuplicate = async (template: TaskTemplate) => {
    const { error } = await createTemplate({
      title: `${template.title} (cópia)`,
      description: template.description || undefined,
      priority: template.priority,
    });

    if (error) {
      toast({ title: 'Erro ao duplicar modelo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Modelo duplicado com sucesso!' });
    }
  };

  const handleSubmit = async (data: { title: string; description?: string; priority: 'baixa' | 'media' | 'alta' }) => {
    if (editingTemplate) {
      const { error } = await updateTemplate(editingTemplate.id, data);
      if (error) {
        toast({ title: 'Erro ao atualizar modelo', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Modelo atualizado com sucesso!' });
        setIsFormOpen(false);
      }
    } else {
      const { error } = await createTemplate(data);
      if (error) {
        toast({ title: 'Erro ao criar modelo', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Modelo criado com sucesso!' });
        setIsFormOpen(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    
    const { error } = await deleteTemplate(deletingTemplate.id);
    if (error) {
      toast({ title: 'Erro ao excluir modelo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Modelo excluído com sucesso!' });
    }
    setDeletingTemplate(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Modelos de Tarefas"
          description="Crie e gerencie modelos de tarefas para reutilizar"
          action={
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Modelo
            </Button>
          }
        />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Nenhum modelo encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Crie seu primeiro modelo de tarefa para começar a reutilizar.
            </p>
            <Button onClick={handleCreate} className="gap-2 mt-4">
              <Plus className="h-4 w-4" />
              Criar Modelo
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{template.title}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={priorityConfig[template.priority].variant}>
                        {priorityConfig[template.priority].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(template)}
                        className="gap-1.5"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingTemplate(template)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <TemplateFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        template={editingTemplate}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deletingTemplate}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
        title="Excluir modelo"
        description={`Tem certeza que deseja excluir o modelo "${deletingTemplate?.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        confirmText="Excluir"
        variant="destructive"
      />
    </AppLayout>
  );
}
