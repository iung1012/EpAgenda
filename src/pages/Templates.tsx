import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Pencil, Trash2, Copy, Link2, ExternalLink, Search, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTaskTemplates, TaskTemplate } from '@/hooks/useTaskTemplates';
import { useToast } from '@/hooks/use-toast';
import TemplateFormDialog from '@/components/forms/TemplateFormDialog';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { CardSkeleton } from '@/components/layout/CardSkeleton';

const priorityConfig = {
  baixa: { label: 'Baixa', variant: 'secondary' as const, dot: 'bg-emerald-500' },
  media: { label: 'Média', variant: 'default' as const, dot: 'bg-amber-500' },
  alta: { label: 'Alta', variant: 'destructive' as const, dot: 'bg-red-500' },
};

type ViewMode = 'grid' | 'list';
type SortBy = 'recent' | 'title' | 'priority';

export default function Templates() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTaskTemplates();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TaskTemplate | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('recent');

  const filteredTemplates = templates
    .filter(t =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'priority') {
        const order = { alta: 0, media: 1, baixa: 2 };
        return order[a.priority] - order[b.priority];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const sortLabels: Record<SortBy, string> = { recent: 'Recentes', title: 'Título', priority: 'Prioridade' };
  const nextSort: Record<SortBy, SortBy> = { recent: 'title', title: 'priority', priority: 'recent' };

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
      link: template.link || undefined,
    });
    if (error) {
      toast({ title: 'Erro ao duplicar modelo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Modelo duplicado com sucesso!' });
    }
  };

  const handleSubmit = async (data: { title: string; description?: string; priority: 'baixa' | 'media' | 'alta'; link?: string }) => {
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

  const ActionButtons = ({ template }: { template: TaskTemplate }) => (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(template)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editar</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(template)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicar</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingTemplate(template)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Excluir</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  const GridCard = ({ template, index }: { template: TaskTemplate; index: number }) => (
    <motion.div
      key={template.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04 }}
      layout
    >
      <Card className="group h-full hover-lift border-border/60 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-1 h-full ${priorityConfig[template.priority].dot} rounded-l-lg`} />
        <CardContent className="p-5 pl-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{template.title}</h3>
              {template.description && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              )}
            </div>
            <Badge variant={priorityConfig[template.priority].variant} className="text-[10px] px-2 py-0.5 shrink-0">
              {priorityConfig[template.priority].label}
            </Badge>
          </div>

          {template.link && (
            <a
              href={template.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 group/link"
            >
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{template.link.replace(/^https?:\/\//, '')}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
            </a>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">
              {new Date(template.created_at).toLocaleDateString('pt-BR')}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionButtons template={template} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const ListRow = ({ template, index }: { template: TaskTemplate; index: number }) => (
    <motion.div
      key={template.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay: index * 0.03 }}
      layout
    >
      <div className="group flex items-center gap-4 px-4 py-3 rounded-xl border border-border/40 bg-card hover:bg-accent/40 transition-colors">
        <div className={`w-2 h-2 rounded-full shrink-0 ${priorityConfig[template.priority].dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">{template.title}</span>
            {template.link && (
              <a href={template.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {template.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{template.description}</p>
          )}
        </div>
        <Badge variant={priorityConfig[template.priority].variant} className="text-[10px] px-2 py-0.5 shrink-0 hidden sm:inline-flex">
          {priorityConfig[template.priority].label}
        </Badge>
        <span className="text-[10px] text-muted-foreground shrink-0 hidden md:block">
          {new Date(template.created_at).toLocaleDateString('pt-BR')}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <ActionButtons template={template} />
        </div>
      </div>
    </motion.div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Modelos de Tarefas"
          description="Crie e gerencie modelos reutilizáveis"
          action={
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Modelo
            </Button>
          }
        />

        {/* Toolbar */}
        {!isLoading && templates.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar modelos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={() => setSortBy(nextSort[sortBy])}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortLabels[sortBy]}
              </Button>
              <div className="flex items-center border border-border rounded-lg p-0.5">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Nenhum modelo ainda</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
              Crie modelos de tarefas para agilizar a criação de novas tarefas.
            </p>
            <Button onClick={handleCreate} className="gap-2 mt-5">
              <Plus className="h-4 w-4" />
              Criar Primeiro Modelo
            </Button>
          </motion.div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum modelo encontrado para "<span className="font-medium text-foreground">{search}</span>"
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <AnimatePresence mode="popLayout">
            <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" layout>
              {filteredTemplates.map((template, index) => (
                <GridCard key={template.id} template={template} index={index} />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div className="flex flex-col gap-2" layout>
              {filteredTemplates.map((template, index) => (
                <ListRow key={template.id} template={template} index={index} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Stats footer */}
        {!isLoading && templates.length > 0 && (
          <div className="flex items-center justify-center pt-2">
            <span className="text-xs text-muted-foreground">
              {filteredTemplates.length} de {templates.length} modelo{templates.length !== 1 ? 's' : ''}
            </span>
          </div>
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
