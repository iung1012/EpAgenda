import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUpload } from '@/components/FileUpload';
import { motion } from 'framer-motion';
import { Plus, Trash2, ExternalLink, FileText, FolderOpen } from 'lucide-react';

interface ClientFolder {
  id: string;
  folder_type: string;
  name: string;
  description: string | null;
  file_url: string | null;
}

interface ClientFoldersTabProps {
  folders: ClientFolder[];
  clientId: string;
  isAdminOrManager: boolean;
  isFolderDialogOpen: boolean;
  setIsFolderDialogOpen: (open: boolean) => void;
  currentFolderType: string;
  setCurrentFolderType: (type: string) => void;
  folderForm: { name: string; description: string; file_url: string };
  setFolderForm: (form: any) => void;
  onAddFolder: (e: React.FormEvent) => void;
  onDeleteFolder: (id: string, name: string) => void;
}

const folderTitles: Record<string, string> = {
  estrategia: 'Estratégia',
  trafego_pago: 'Tráfego Pago',
  logotipos: 'Logotipos',
  arquivos: 'Arquivos Gerais',
};

export function ClientFoldersTab({
  folders,
  clientId,
  isAdminOrManager,
  isFolderDialogOpen,
  setIsFolderDialogOpen,
  currentFolderType,
  setCurrentFolderType,
  folderForm,
  setFolderForm,
  onAddFolder,
  onDeleteFolder,
}: ClientFoldersTabProps) {
  const getFoldersByType = (type: string) => folders.filter(f => f.folder_type === type);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-4"
    >
      {['estrategia', 'trafego_pago', 'logotipos', 'arquivos'].map((type) => {
        const typeFolders = getFoldersByType(type);
        return (
          <motion.div key={type} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{folderTitles[type]}</h3>
                    <span className="text-xs text-muted-foreground">({typeFolders.length})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() => {
                      setCurrentFolderType(type);
                      setIsFolderDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar
                  </Button>
                </div>

                {typeFolders.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Nenhum arquivo</p>
                ) : (
                  <div className="space-y-1.5">
                    {typeFolders.map((folder) => (
                      <div key={folder.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{folder.name}</p>
                            {folder.description && (
                              <p className="text-xs text-muted-foreground truncate">{folder.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {folder.file_url && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(folder.file_url!, '_blank')}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isAdminOrManager && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onDeleteFolder(folder.id, folder.name)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Arquivo</DialogTitle>
          </DialogHeader>
          <form onSubmit={onAddFolder} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={folderForm.name} onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })} placeholder="Nome do arquivo" required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={folderForm.description} onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })} placeholder="Descrição opcional..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <FileUpload clientId={clientId} folder={currentFolderType} accept="*/*" onUploadComplete={(url) => setFolderForm({ ...folderForm, file_url: url })} label="Enviar arquivo" />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsFolderDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Adicionar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
