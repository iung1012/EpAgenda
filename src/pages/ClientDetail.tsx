import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import { DriveExplorer } from '@/components/drive/DriveExplorer';
import { 
  ArrowLeft, 
  Building2, 
  Palette, 
  FileText, 
  Lock, 
  ExternalLink,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Instagram,
  Facebook,
  Linkedin,
  Globe,
  Upload,
  Twitter,
  Youtube,
  Share2,
  Pencil,
  Image as ImageIcon,
  Download,
  HardDrive
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  segment: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  color_palette: string[];
  social_links: Record<string, string>;
  google_drive_link: string | null;
  trello_link: string | null;
  notes: string | null;
}

interface ClientPassword {
  id: string;
  service_name: string;
  username: string | null;
  encrypted_password: string;
  notes: string | null;
}

interface ClientFolder {
  id: string;
  folder_type: string;
  name: string;
  description: string | null;
  file_url: string | null;
}

interface ClientDriveFolder {
  id: string;
  folder_id: string;
  folder_name: string;
  folder_type: string | null;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdminOrManager } = useAuth();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [passwords, setPasswords] = useState<ClientPassword[]>([]);
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [driveFolder, setDriveFolder] = useState<ClientDriveFolder | null>(null);
  const [isDriveLinkDialogOpen, setIsDriveLinkDialogOpen] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [currentFolderType, setCurrentFolderType] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [passwordForm, setPasswordForm] = useState({
    service_name: '',
    username: '',
    password: '',
    notes: '',
  });
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: '',
    file_url: '',
  });
  const [isSocialDialogOpen, setIsSocialDialogOpen] = useState(false);
  const [socialForm, setSocialForm] = useState({
    platform: 'instagram',
    url: '',
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'folder' | 'color' | 'social' | 'password';
    id: string;
    name: string;
    index?: number;
  }>({ open: false, type: 'folder', id: '', name: '' });
  const [editForm, setEditForm] = useState({
    name: '',
    segment: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    google_drive_link: '',
    trello_link: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchClient();
      fetchPasswords();
      fetchFolders();
      fetchDriveFolder();
    }
  }, [id]);

  const fetchClient = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (data) {
      setClient({
        ...data,
        color_palette: Array.isArray(data.color_palette) ? (data.color_palette as string[]) : [],
        social_links: typeof data.social_links === 'object' && data.social_links !== null 
          ? data.social_links as Record<string, string> 
          : {},
      });
    }
  };

  const fetchPasswords = async () => {
    const { data } = await supabase
      .from('client_passwords')
      .select('*')
      .eq('client_id', id)
      .order('service_name');

    if (data) {
      setPasswords(data);
    }
  };

  const fetchFolders = async () => {
    const { data } = await supabase
      .from('client_folders')
      .select('*')
      .eq('client_id', id)
      .order('folder_type, name');

    if (data) {
      setFolders(data);
    }
  };

  const fetchDriveFolder = async () => {
    const { data } = await supabase
      .from('client_drive_folders')
      .select('*')
      .eq('client_id', id)
      .limit(1)
      .maybeSingle();

    if (data) {
      setDriveFolder(data);
    }
  };

  const extractFolderIdFromUrl = (url: string): string | null => {
    // Patterns: 
    // https://drive.google.com/drive/folders/FOLDER_ID
    // https://drive.google.com/drive/u/0/folders/FOLDER_ID
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleLinkDriveFolder = async () => {
    const folderId = extractFolderIdFromUrl(driveLinkInput) || driveLinkInput.trim();
    
    if (!folderId) {
      toast({ variant: 'destructive', title: 'ID da pasta inválido' });
      return;
    }

    // Check if already exists
    if (driveFolder) {
      // Update existing
      const { error } = await supabase
        .from('client_drive_folders')
        .update({ folder_id: folderId, folder_name: 'Pasta Principal' })
        .eq('id', driveFolder.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao atualizar pasta', description: error.message });
      } else {
        setDriveFolder({ ...driveFolder, folder_id: folderId });
        setIsDriveLinkDialogOpen(false);
        setDriveLinkInput('');
        toast({ title: 'Pasta do Drive atualizada!' });
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('client_drive_folders')
        .insert({
          client_id: id,
          folder_id: folderId,
          folder_name: 'Pasta Principal',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao vincular pasta', description: error.message });
      } else {
        setDriveFolder(data);
        setIsDriveLinkDialogOpen(false);
        setDriveLinkInput('');
        toast({ title: 'Pasta do Drive vinculada!' });
      }
    }
  };

  const togglePasswordVisibility = (passwordId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(passwordId)) {
        newSet.delete(passwordId);
      } else {
        newSet.add(passwordId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado para a área de transferência' });
  };

  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.service_name || !passwordForm.password) {
      toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios' });
      return;
    }

    const { error } = await supabase.from('client_passwords').insert({
      client_id: id,
      service_name: passwordForm.service_name,
      username: passwordForm.username || null,
      encrypted_password: btoa(passwordForm.password), // Simple encoding for demo
      notes: passwordForm.notes || null,
      created_by: user?.id,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar senha', description: error.message });
    } else {
      toast({ title: 'Senha salva com sucesso!' });
      setIsPasswordDialogOpen(false);
      setPasswordForm({ service_name: '', username: '', password: '', notes: '' });
      fetchPasswords();
    }
  };

  const handleAddColor = async () => {
    if (!client) return;

    const newPalette = [...client.color_palette, newColor];
    const { error } = await supabase
      .from('clients')
      .update({ color_palette: newPalette })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar cor' });
    } else {
      setClient({ ...client, color_palette: newPalette });
      setIsColorDialogOpen(false);
      toast({ title: 'Cor adicionada!' });
    }
  };

  const handleRemoveColor = async (index: number) => {
    if (!client) return;

    const newPalette = client.color_palette.filter((_, i) => i !== index);
    const { error } = await supabase
      .from('clients')
      .update({ color_palette: newPalette })
      .eq('id', id);

    if (!error) {
      setClient({ ...client, color_palette: newPalette });
      toast({ title: 'Cor removida!' });
    }
    setConfirmDialog({ open: false, type: 'folder', id: '', name: '' });
  };

  const openRemoveColorDialog = (index: number, color: string) => {
    setConfirmDialog({ open: true, type: 'color', id: '', name: color, index });
  };

  const handleLogoUpload = async (url: string) => {
    if (!client) return;
    
    const { error } = await supabase
      .from('clients')
      .update({ logo_url: url || null })
      .eq('id', id);

    if (error) {
      console.error('Error updating logo:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar logo', description: error.message });
    } else {
      setClient({ ...client, logo_url: url || null });
      toast({ title: url ? 'Logo atualizado!' : 'Logo removido!' });
    }
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderForm.name) {
      toast({ variant: 'destructive', title: 'Nome é obrigatório' });
      return;
    }

    const { error } = await supabase.from('client_folders').insert({
      client_id: id,
      folder_type: currentFolderType,
      name: folderForm.name,
      description: folderForm.description || null,
      file_url: folderForm.file_url || null,
      created_by: user?.id,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar arquivo', description: error.message });
    } else {
      toast({ title: 'Arquivo adicionado!' });
      setIsFolderDialogOpen(false);
      setFolderForm({ name: '', description: '', file_url: '' });
      fetchFolders();
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const { error } = await supabase.from('client_folders').delete().eq('id', folderId);
    if (!error) {
      toast({ title: 'Arquivo removido!' });
      fetchFolders();
    }
    setConfirmDialog({ open: false, type: 'folder', id: '', name: '' });
  };

  const openDeleteFolderDialog = (folderId: string, folderName: string) => {
    setConfirmDialog({ open: true, type: 'folder', id: folderId, name: folderName });
  };

  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !socialForm.url.trim()) {
      toast({ variant: 'destructive', title: 'URL é obrigatória' });
      return;
    }

    // Validar URL
    try {
      new URL(socialForm.url);
    } catch {
      toast({ variant: 'destructive', title: 'URL inválida' });
      return;
    }

    const newLinks = { ...client.social_links, [socialForm.platform]: socialForm.url };
    const { error } = await supabase
      .from('clients')
      .update({ social_links: newLinks })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar link' });
    } else {
      setClient({ ...client, social_links: newLinks });
      setIsSocialDialogOpen(false);
      setSocialForm({ platform: 'instagram', url: '' });
      toast({ title: 'Link adicionado!' });
    }
  };

  const handleRemoveSocialLink = async (platform: string) => {
    if (!client) return;

    const newLinks = { ...client.social_links };
    delete newLinks[platform];
    
    const { error } = await supabase
      .from('clients')
      .update({ social_links: newLinks })
      .eq('id', id);

    if (!error) {
      setClient({ ...client, social_links: newLinks });
      toast({ title: 'Link removido!' });
    }
    setConfirmDialog({ open: false, type: 'folder', id: '', name: '' });
  };

  const openRemoveSocialDialog = (platform: string) => {
    setConfirmDialog({ open: true, type: 'social', id: platform, name: platform });
  };

  const handleConfirmAction = () => {
    const { type, id, index } = confirmDialog;
    switch (type) {
      case 'folder':
        handleDeleteFolder(id);
        break;
      case 'color':
        if (index !== undefined) handleRemoveColor(index);
        break;
      case 'social':
        handleRemoveSocialLink(id);
        break;
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return Instagram;
      case 'facebook': return Facebook;
      case 'linkedin': return Linkedin;
      case 'twitter': return Twitter;
      case 'youtube': return Youtube;
      case 'tiktok': return Share2;
      default: return Globe;
    }
  };

  const socialPlatforms = [
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'facebook', label: 'Facebook', icon: Facebook },
    { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { value: 'twitter', label: 'Twitter/X', icon: Twitter },
    { value: 'youtube', label: 'YouTube', icon: Youtube },
    { value: 'tiktok', label: 'TikTok', icon: Share2 },
    { value: 'website', label: 'Website', icon: Globe },
  ];

  const getFoldersByType = (type: string) => folders.filter(f => f.folder_type === type);

  const openEditDialog = () => {
    if (!client) return;
    setEditForm({
      name: client.name || '',
      segment: client.segment || '',
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      google_drive_link: client.google_drive_link || '',
      trello_link: client.trello_link || '',
      notes: client.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast({ variant: 'destructive', title: 'Nome é obrigatório' });
      return;
    }

    const { error } = await supabase
      .from('clients')
      .update({
        name: editForm.name.trim(),
        segment: editForm.segment || null,
        contact_name: editForm.contact_name || null,
        contact_email: editForm.contact_email || null,
        contact_phone: editForm.contact_phone || null,
        google_drive_link: editForm.google_drive_link || null,
        trello_link: editForm.trello_link || null,
        notes: editForm.notes || null,
      })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar cliente', description: error.message });
    } else {
      setClient({
        ...client!,
        name: editForm.name.trim(),
        segment: editForm.segment || null,
        contact_name: editForm.contact_name || null,
        contact_email: editForm.contact_email || null,
        contact_phone: editForm.contact_phone || null,
        google_drive_link: editForm.google_drive_link || null,
        trello_link: editForm.trello_link || null,
        notes: editForm.notes || null,
      });
      setIsEditDialogOpen(false);
      toast({ title: 'Cliente atualizado com sucesso!' });
    }
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <FileUpload
            clientId={id!}
            folder="logos"
            accept="image/*"
            currentUrl={client.logo_url}
            onUploadComplete={handleLogoUpload}
            isLogo
          />
          <div>
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            {client.segment && <p className="text-muted-foreground">{client.segment}</p>}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        {client.logo_url && (
          <div className="flex items-center gap-1">
            <Button variant="outline" onClick={() => window.open(client.logo_url!, '_blank')}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Logo
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={async () => {
                try {
                  const response = await fetch(client.logo_url!);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${client.name}-logo.${blob.type.split('/')[1] || 'png'}`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  toast({ title: 'Logo baixado!' });
                } catch {
                  toast({ variant: 'destructive', title: 'Erro ao baixar logo' });
                }
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
        {client.google_drive_link && (
          <Button variant="outline" onClick={() => window.open(client.google_drive_link!, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Google Drive
          </Button>
        )}
        {client.trello_link && (
          <Button variant="outline" onClick={() => window.open(client.trello_link!, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Trello
          </Button>
        )}
        {Object.entries(client.social_links).map(([platform, url]) => {
          const Icon = getSocialIcon(platform);
          return (
            <Button key={platform} variant="outline" onClick={() => window.open(url, '_blank')}>
              <Icon className="h-4 w-4 mr-2" />
              {platform}
            </Button>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="social">Redes Sociais</TabsTrigger>
          <TabsTrigger value="palette">Paleta de Cores</TabsTrigger>
          <TabsTrigger value="folders">Pastas</TabsTrigger>
          <TabsTrigger value="drive" className="flex items-center gap-1">
            <HardDrive className="h-4 w-4" />
            Drive
          </TabsTrigger>
          {isAdminOrManager && <TabsTrigger value="passwords">Senhas</TabsTrigger>}
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações de Contato</CardTitle>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" onClick={openEditDialog}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEditClient} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome do Cliente *</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Segmento</Label>
                      <Input
                        value={editForm.segment}
                        onChange={(e) => setEditForm({ ...editForm, segment: e.target.value })}
                        placeholder="Ex: Tecnologia, Saúde, Varejo..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome do Contato</Label>
                        <Input
                          value={editForm.contact_name}
                          onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input
                          value={editForm.contact_phone}
                          onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editForm.contact_email}
                        onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link Google Drive</Label>
                      <Input
                        value={editForm.google_drive_link}
                        onChange={(e) => setEditForm({ ...editForm, google_drive_link: e.target.value })}
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link Trello</Label>
                      <Input
                        value={editForm.trello_link}
                        onChange={(e) => setEditForm({ ...editForm, trello_link: e.target.value })}
                        placeholder="https://trello.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Salvar</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Nome do Contato</Label>
                  <p className="font-medium">{client.contact_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium">{client.contact_email || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Telefone</Label>
                  <p className="font-medium">{client.contact_phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Segmento</Label>
                  <p className="font-medium">{client.segment || '-'}</p>
                </div>
              </div>
              {client.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Observações</Label>
                  <p className="font-medium whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Redes Sociais
              </CardTitle>
              <Dialog open={isSocialDialogOpen} onOpenChange={setIsSocialDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Link
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Rede Social</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddSocialLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Plataforma</Label>
                      <Select
                        value={socialForm.platform}
                        onValueChange={(value) => setSocialForm({ ...socialForm, platform: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {socialPlatforms.map((platform) => (
                            <SelectItem key={platform.value} value={platform.value}>
                              <div className="flex items-center gap-2">
                                <platform.icon className="h-4 w-4" />
                                {platform.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>URL *</Label>
                      <Input
                        value={socialForm.url}
                        onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
                        placeholder="https://instagram.com/usuario"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsSocialDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Adicionar</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {Object.keys(client.social_links).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma rede social cadastrada
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(client.social_links).map(([platform, url]) => {
                    const Icon = getSocialIcon(platform);
                    const platformInfo = socialPlatforms.find(p => p.value === platform.toLowerCase());
                    return (
                      <div key={platform} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 group">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{platformInfo?.label || platform}</p>
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground hover:text-primary truncate max-w-[300px] block"
                            >
                              {url}
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => openRemoveSocialDialog(platform)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="palette" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Paleta de Cores
              </CardTitle>
              <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Cor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Cor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="h-20 w-20 p-1 cursor-pointer"
                      />
                      <Input
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        placeholder="#000000"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsColorDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddColor}>Adicionar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {client.color_palette.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma cor definida
                </p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {client.color_palette.map((color, index) => (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div
                        className="h-16 w-16 rounded-xl border shadow-sm cursor-pointer relative group"
                        style={{ backgroundColor: color }}
                      >
                        <button
                          onClick={() => openRemoveColorDialog(index, color)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => copyToClipboard(color)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {color}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folders" className="mt-6 space-y-6">
          {['estrategia', 'trafego_pago', 'logotipos', 'arquivos'].map((type) => {
            const typeFolders = getFoldersByType(type);
            const titles: Record<string, string> = {
              estrategia: 'Estratégia',
              trafego_pago: 'Tráfego Pago',
              logotipos: 'Logotipos',
              arquivos: 'Arquivos Gerais',
            };
            return (
              <Card key={type}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    {titles[type]}
                  </CardTitle>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setCurrentFolderType(type);
                      setIsFolderDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </CardHeader>
                <CardContent>
                  {typeFolders.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum arquivo</p>
                  ) : (
                    <div className="space-y-2">
                      {typeFolders.map((folder) => (
                        <div key={folder.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 group">
                          <div>
                            <p className="font-medium text-sm">{folder.name}</p>
                            {folder.description && (
                              <p className="text-xs text-muted-foreground">{folder.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {folder.file_url && (
                              <Button variant="ghost" size="sm" onClick={() => window.open(folder.file_url!, '_blank')}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdminOrManager && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="opacity-0 group-hover:opacity-100 text-destructive"
                                onClick={() => openDeleteFolderDialog(folder.id, folder.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Dialog para adicionar arquivo/pasta */}
          <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Arquivo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddFolder} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={folderForm.name}
                    onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                    placeholder="Nome do arquivo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={folderForm.description}
                    onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
                    placeholder="Descrição opcional..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arquivo</Label>
                  <FileUpload
                    clientId={id!}
                    folder={currentFolderType}
                    accept="*/*"
                    onUploadComplete={(url) => setFolderForm({ ...folderForm, file_url: url })}
                    label="Enviar arquivo"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsFolderDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Adicionar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {isAdminOrManager && (
          <TabsContent value="passwords" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Cofre de Senhas
                </CardTitle>
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Senha
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Senha</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Serviço *</Label>
                        <Input
                          value={passwordForm.service_name}
                          onChange={(e) => setPasswordForm({ ...passwordForm, service_name: e.target.value })}
                          placeholder="Ex: Instagram, Facebook Ads..."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Usuário/Email</Label>
                        <Input
                          value={passwordForm.username}
                          onChange={(e) => setPasswordForm({ ...passwordForm, username: e.target.value })}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Senha *</Label>
                        <Input
                          type="password"
                          value={passwordForm.password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Input
                          value={passwordForm.notes}
                          onChange={(e) => setPasswordForm({ ...passwordForm, notes: e.target.value })}
                          placeholder="Notas adicionais..."
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">Salvar</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {passwords.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma senha cadastrada
                  </p>
                ) : (
                  <div className="space-y-3">
                    {passwords.map((pwd) => (
                      <div key={pwd.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="space-y-1">
                          <p className="font-medium">{pwd.service_name}</p>
                          {pwd.username && (
                            <p className="text-sm text-muted-foreground">{pwd.username}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-background rounded-lg px-3 py-1.5">
                            <span className="text-sm font-mono">
                              {visiblePasswords.has(pwd.id) 
                                ? atob(pwd.encrypted_password) 
                                : '••••••••'}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePasswordVisibility(pwd.id)}
                          >
                            {visiblePasswords.has(pwd.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(atob(pwd.encrypted_password))}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Drive Tab */}
        <TabsContent value="drive" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Google Drive
              </CardTitle>
              <Dialog open={isDriveLinkDialogOpen} onOpenChange={setIsDriveLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant={driveFolder ? "outline" : "default"}>
                    {driveFolder ? (
                      <>
                        <Pencil className="h-4 w-4 mr-2" />
                        Alterar Pasta
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Vincular Pasta
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {driveFolder ? 'Alterar Pasta do Drive' : 'Vincular Pasta do Google Drive'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Link ou ID da Pasta</Label>
                      <Input
                        value={driveLinkInput}
                        onChange={(e) => setDriveLinkInput(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Cole o link da pasta do Google Drive ou apenas o ID da pasta
                      </p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsDriveLinkDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleLinkDriveFolder}>
                        {driveFolder ? 'Atualizar' : 'Vincular'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {driveFolder ? (
                <DriveExplorer folderId={driveFolder.folder_id} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Nenhuma pasta do Drive vinculada a este cliente</p>
                  <Button onClick={() => setIsDriveLinkDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Vincular Pasta do Drive
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={
          confirmDialog.type === 'folder' ? 'Excluir arquivo' :
          confirmDialog.type === 'color' ? 'Remover cor' :
          'Remover link'
        }
        description={
          confirmDialog.type === 'folder' 
            ? `Tem certeza que deseja excluir "${confirmDialog.name}"? Esta ação não pode ser desfeita.`
            : confirmDialog.type === 'color'
            ? `Tem certeza que deseja remover a cor ${confirmDialog.name} da paleta?`
            : `Tem certeza que deseja remover o link do ${confirmDialog.name}?`
        }
        confirmText="Remover"
        onConfirm={handleConfirmAction}
        variant="destructive"
      />
    </div>
  );
}
