import { useEffect, useState, useRef } from 'react';
import { useDriveFiles, DriveFile } from '@/hooks/useDriveFiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Folder,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  Presentation,
  Search,
  X,
  ChevronRight,
  Home,
  ExternalLink,
  Download,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriveExplorerProps {
  folderId?: string;
  className?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') {
    return <Folder className="h-5 w-5 text-yellow-500" />;
  }
  if (mimeType.includes('image')) {
    return <FileImage className="h-5 w-5 text-pink-500" />;
  }
  if (mimeType.includes('video')) {
    return <FileVideo className="h-5 w-5 text-purple-500" />;
  }
  if (mimeType.includes('audio')) {
    return <FileAudio className="h-5 w-5 text-green-500" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return <Presentation className="h-5 w-5 text-orange-500" />;
  }
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes?: string): string {
  if (!bytes) return '';
  const size = parseInt(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const isImage = (mimeType: string) => mimeType.includes('image');
const isVideo = (mimeType: string) => mimeType.includes('video');
const isAudio = (mimeType: string) => mimeType.includes('audio');
const isPdf = (mimeType: string) => mimeType.includes('pdf');

// Generate stream URL for media
function getStreamUrl(fileId: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/google-drive?action=stream&fileId=${fileId}`;
}

// Thumbnail component that fetches via edge function proxy
function ThumbnailImage({ 
  fileId, 
  fileName, 
  authToken, 
  large = false 
}: { 
  fileId: string; 
  fileName: string; 
  authToken: string | null;
  large?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!authToken) return;
    
    const fetchThumbnail = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/google-drive?action=thumbnail&fileId=${fileId}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          }
        );

        if (response.ok) {
          const blob = await response.blob();
          setSrc(URL.createObjectURL(blob));
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchThumbnail();
  }, [fileId, authToken]);

  if (loading) {
    return <Skeleton className={large ? "w-full h-[70vh]" : "h-10 w-10 rounded"} />;
  }

  if (error || !src) {
    return (
      <div className={cn(
        "rounded bg-muted flex items-center justify-center",
        large ? "w-full h-64" : "h-10 w-10"
      )}>
        <FileImage className={cn("text-pink-500", large ? "h-12 w-12" : "h-5 w-5")} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={fileName}
      className={cn(
        "object-cover rounded",
        large ? "max-w-full max-h-[70vh] object-contain" : "h-10 w-10"
      )}
    />
  );
}

// Video player component with real-time streaming
function VideoPlayer({ 
  fileId, 
  fileName, 
  authToken 
}: { 
  fileId: string; 
  fileName: string; 
  authToken: string | null;
}) {
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // Fetch a short-lived signed stream token (bound to fileId, ~5min TTL),
  // then build a streaming URL that never carries the raw user JWT.
  useEffect(() => {
    let cancelled = false;
    if (!authToken) {
      setStreamUrl(null);
      return;
    }
    (async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/google-drive?action=streamToken&fileId=${fileId}`,
          { headers: { Authorization: `Bearer ${authToken}` } },
        );
        if (!res.ok) throw new Error('token');
        const { token } = await res.json();
        if (cancelled) return;
        setStreamUrl(
          `https://${projectId}.supabase.co/functions/v1/google-drive?action=stream&fileId=${fileId}&st=${encodeURIComponent(token)}`,
        );
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileId, authToken]);

  const handleError = () => {
    setError(true);
  };

  if (!authToken || !streamUrl) {
    return (
      <div className="w-full max-w-3xl aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center space-y-2">
          <FileVideo className="h-12 w-12 text-purple-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Autenticação necessária</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center space-y-2">
          <FileVideo className="h-12 w-12 text-purple-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Não foi possível carregar o vídeo</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={streamUrl}
      controls
      autoPlay
      preload="metadata"
      onError={handleError}
      className="w-full max-w-3xl max-h-[70vh] rounded-lg"
    >
      Seu navegador não suporta a reprodução de vídeo.
    </video>
  );
}

export function DriveExplorer({ folderId, className }: DriveExplorerProps) {
  const {
    files,
    loading,
    error,
    breadcrumbs,
    searchQuery,
    fetchFiles,
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    searchFiles,
    clearSearch,
  } = useDriveFiles(folderId);

  const [searchInput, setSearchInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Get auth token for thumbnail requests
  useEffect(() => {
    const getToken = async () => {
      const { data } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      setAuthToken(data?.session?.access_token || null);
    };
    getToken();
  }, []);

  useEffect(() => {
    if (folderId) {
      fetchFiles(folderId);
    }
  }, [folderId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      searchFiles(searchInput);
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    clearSearch();
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      navigateToFolder(file);
    } else {
      // Open all files in modal for preview/links
      setSelectedFile(file);
    }
  };


  if (!folderId) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        <p>Nenhuma pasta do Drive configurada para este cliente.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Actions */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar arquivos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchFiles()}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={navigateToRoot}
        >
          <Home className="h-4 w-4" />
        </Button>
        {breadcrumbs.length > 0 && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => navigateBack()}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </>
        )}
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => navigateBack(index)}
            >
              {crumb.name}
            </Button>
          </div>
        ))}
      </div>

      {/* Search indicator */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Resultados para: "{searchQuery}"</span>
          <Button variant="ghost" size="sm" onClick={handleClearSearch}>
            Limpar busca
          </Button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Files Grid */}
      {!loading && files.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? 'Nenhum arquivo encontrado.' : 'Esta pasta está vazia.'}
        </div>
      )}

      {!loading && files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map((file) => (
            <Card
              key={file.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                selectedFile?.id === file.id && "ring-2 ring-primary"
              )}
              onClick={() => handleFileClick(file)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Thumbnail or Icon */}
                  {isImage(file.mimeType) || isVideo(file.mimeType) ? (
                    <ThumbnailImage
                      fileId={file.id}
                      fileName={file.name}
                      authToken={authToken}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      {getFileIcon(file.mimeType)}
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {file.size && <span>{formatFileSize(file.size)}</span>}
                      {file.modifiedTime && <span>{formatDate(file.modifiedTime)}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  {file.mimeType !== 'application/vnd.google-apps.folder' && (
                    <div className="flex items-center gap-1">
                      {file.webViewLink && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.webViewLink, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {file.webContentLink && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.webContentLink, '_blank');
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedFile(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-card rounded-lg overflow-hidden shadow-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(selectedFile.mimeType)}
                <h3 className="font-medium truncate">{selectedFile.name}</h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedFile.webViewLink && (
                  <a
                    href={selectedFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir no Drive
                  </a>
                )}
                {selectedFile.webContentLink && (
                  <a
                    href={selectedFile.webContentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[200px]">
              {isImage(selectedFile.mimeType) && authToken ? (
                <ThumbnailImage
                  fileId={selectedFile.id}
                  fileName={selectedFile.name}
                  authToken={authToken}
                  large
                />
              ) : isVideo(selectedFile.mimeType) && authToken ? (
                <VideoPlayer
                  fileId={selectedFile.id}
                  fileName={selectedFile.name}
                  authToken={authToken}
                />
              ) : (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-fit">
                    {getFileIcon(selectedFile.mimeType)}
                  </div>
                  <p className="text-muted-foreground">
                    Clique em "Abrir no Drive" para visualizar o arquivo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
