import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DriveExplorer } from '@/components/drive/DriveExplorer';
import { motion } from 'framer-motion';
import { Plus, Pencil, HardDrive } from 'lucide-react';

interface ClientDriveFolder {
  id: string;
  folder_id: string;
  folder_name: string;
  folder_type: string | null;
}

interface ClientDriveTabProps {
  driveFolder: ClientDriveFolder | null;
  isDriveLinkDialogOpen: boolean;
  setIsDriveLinkDialogOpen: (open: boolean) => void;
  driveLinkInput: string;
  setDriveLinkInput: (input: string) => void;
  onLinkDriveFolder: () => void;
}

export function ClientDriveTab({
  driveFolder,
  isDriveLinkDialogOpen,
  setIsDriveLinkDialogOpen,
  driveLinkInput,
  setDriveLinkInput,
  onLinkDriveFolder,
}: ClientDriveTabProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Google Drive</h3>
            </div>
            <Dialog open={isDriveLinkDialogOpen} onOpenChange={setIsDriveLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant={driveFolder ? 'outline' : 'default'} className="h-8 gap-1.5 text-xs">
                  {driveFolder ? <><Pencil className="h-3.5 w-3.5" />Alterar</> : <><Plus className="h-3.5 w-3.5" />Vincular</>}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{driveFolder ? 'Alterar Pasta do Drive' : 'Vincular Pasta do Google Drive'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Link ou ID da Pasta</Label>
                    <Input value={driveLinkInput} onChange={(e) => setDriveLinkInput(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
                    <p className="text-xs text-muted-foreground">Cole o link da pasta do Google Drive ou apenas o ID</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsDriveLinkDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={onLinkDriveFolder}>{driveFolder ? 'Atualizar' : 'Vincular'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {driveFolder ? (
            <DriveExplorer folderId={driveFolder.folder_id} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <HardDrive className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm mb-3">Nenhuma pasta vinculada</p>
              <Button size="sm" onClick={() => setIsDriveLinkDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Vincular Pasta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
