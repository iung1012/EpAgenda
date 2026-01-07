import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  clientId: string;
  folder: string;
  accept?: string;
  onUploadComplete?: (url: string) => void;
  currentUrl?: string | null;
  label?: string;
  isLogo?: boolean;
}

export function FileUpload({ 
  clientId, 
  folder, 
  accept = "image/*", 
  onUploadComplete,
  currentUrl,
  label = "Upload",
  isLogo = false
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Máximo de 5MB' });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('client-files')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: false 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-files')
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onUploadComplete?.(publicUrl);
      
      toast({ title: 'Arquivo enviado com sucesso!' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao enviar arquivo', 
        description: error.message 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadComplete?.('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {isLogo && previewUrl ? (
        <div className="relative inline-block">
          <img 
            src={previewUrl} 
            alt="Logo" 
            className="h-20 w-20 rounded-xl object-cover border"
          />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : isLogo ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-20 w-20 rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-secondary/50 transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Logo</span>
            </>
          )}
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {label}
        </Button>
      )}

      {!isLogo && previewUrl && (
        <div className="flex items-center gap-2 text-sm">
          <a 
            href={previewUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate max-w-[200px]"
          >
            Ver arquivo
          </a>
          <button onClick={handleRemove} className="text-destructive hover:text-destructive/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
