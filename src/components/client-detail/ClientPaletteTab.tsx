import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/layout/EmptyState';
import { motion } from 'framer-motion';
import { Plus, Trash2, Palette, Copy } from 'lucide-react';

interface ClientPaletteTabProps {
  colorPalette: string[];
  isColorDialogOpen: boolean;
  setIsColorDialogOpen: (open: boolean) => void;
  newColor: string;
  setNewColor: (color: string) => void;
  onAddColor: () => void;
  onRemoveColor: (index: number, color: string) => void;
  onCopyToClipboard: (text: string) => void;
}

export function ClientPaletteTab({
  colorPalette,
  isColorDialogOpen,
  setIsColorDialogOpen,
  newColor,
  setNewColor,
  onAddColor,
  onRemoveColor,
  onCopyToClipboard,
}: ClientPaletteTabProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Paleta de Cores</h3>
            <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Cor</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-20 w-20 p-1 cursor-pointer" />
                    <div className="space-y-2 flex-1">
                      <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="#000000" />
                      <div className="h-8 rounded-lg border" style={{ backgroundColor: newColor }} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsColorDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={onAddColor}>Adicionar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {colorPalette.length === 0 ? (
            <EmptyState icon={Palette} title="Nenhuma cor definida" description="Adicione as cores da marca" />
          ) : (
            <div className="space-y-4">
              {/* Palette preview bar */}
              <div className="flex h-12 rounded-xl overflow-hidden shadow-sm">
                {colorPalette.map((color, i) => (
                  <div key={i} className="flex-1 transition-all hover:flex-[2]" style={{ backgroundColor: color }} />
                ))}
              </div>

              {/* Color swatches */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {colorPalette.map((color, index) => (
                  <div key={index} className="group relative">
                    <div className="aspect-square rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: color }}>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => onCopyToClipboard(color)}
                          className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
                        >
                          <Copy className="h-3 w-3 text-foreground" />
                        </button>
                        <button
                          onClick={() => onRemoveColor(index, color)}
                          className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => onCopyToClipboard(color)}
                      className="mt-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-center font-mono"
                    >
                      {color}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
