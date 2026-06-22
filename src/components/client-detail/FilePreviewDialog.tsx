import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download } from 'lucide-react';
import { getFileKind } from '@/lib/fileType';

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  name: string;
}

export function FilePreviewDialog({ open, onOpenChange, url, name }: FilePreviewDialogProps) {
  const kind = getFileKind(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto rounded-lg bg-muted/30 flex items-center justify-center">
          {!url ? (
            <p className="text-sm text-muted-foreground p-8">Nenhum arquivo disponível.</p>
          ) : kind === 'image' ? (
            <img src={url} alt={name} className="max-h-[70vh] w-auto object-contain" />
          ) : kind === 'pdf' ? (
            <iframe src={url} title={name} className="w-full h-[70vh]" />
          ) : kind === 'video' ? (
            <video src={url} controls className="max-h-[70vh] w-full">
              Seu navegador não suporta vídeo.
            </video>
          ) : kind === 'audio' ? (
            <div className="p-8 w-full">
              <audio src={url} controls className="w-full" />
            </div>
          ) : (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Não é possível pré-visualizar este tipo de arquivo.
              </p>
              <Button onClick={() => window.open(url, '_blank')} className="gap-2">
                <ExternalLink className="h-4 w-4" /> Abrir em nova aba
              </Button>
            </div>
          )}
        </div>

        {url && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(url, '_blank')}>
              <ExternalLink className="h-4 w-4" /> Abrir
            </Button>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href={url} download={name}>
                <Download className="h-4 w-4" /> Baixar
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
