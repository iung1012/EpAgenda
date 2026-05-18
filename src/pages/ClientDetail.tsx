import { useEffect, useState } from 'react';
import { encryptPassword, decryptPassword } from '@/lib/crypto';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { ClientHeader } from '@/components/client-detail/ClientHeader';
import { ClientInfoTab } from '@/components/client-detail/ClientInfoTab';
import { ClientSocialTab } from '@/components/client-detail/ClientSocialTab';
import { ClientPaletteTab } from '@/components/client-detail/ClientPaletteTab';
import { ClientFoldersTab } from '@/components/client-detail/ClientFoldersTab';
import { ClientPasswordsTab } from '@/components/client-detail/ClientPasswordsTab';
import { ClientDriveTab } from '@/components/client-detail/ClientDriveTab';
import { FileUpload } from '@/components/FileUpload';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Info,
  Share2,
  Palette,
  FolderOpen,
  Lock,
  HardDrive,
} from 'lucide-react';

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
  canva_link: string | null;
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
  const [editingPassword, setEditingPassword] = useState<ClientPassword | null>(null);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [currentFolderType, setCurrentFolderType] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [passwordForm, setPasswordForm] = useState({ service_name: '', username: '', password: '', notes: '' });
  const [folderForm, setFolderForm] = useState({ name: '', description: '', file_url: '' });
  const [isSocialDialogOpen, setIsSocialDialogOpen] = useState(false);
  const [socialForm, setSocialForm] = useState({ platform: 'instagram', url: '' });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'folder' | 'color' | 'social' | 'password';
    id: string;
    name: string;
    index?: number;
  }>({ open: false, type: 'folder', id: '', name: '' });
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', segment: '', contact_name: '', contact_email: '', contact_phone: '', google_drive_link: '', canva_link: '', notes: '',
  });

  useEffect(() => {
    if (id) { fetchClient(); fetchPasswords(); fetchFolders(); fetchDriveFolder(); }
  }, [id]);

  const fetchClient = async () => {
    const { data } = await supabase.from('clients').select('*').eq('id', id).single();
    if (data) {
      setClient({
        ...data,
        color_palette: Array.isArray(data.color_palette) ? (data.color_palette as string[]) : [],
        social_links: typeof data.social_links === 'object' && data.social_links !== null ? data.social_links as Record<string, string> : {},
      });
    }
  };

  const fetchPasswords = async () => {
    const { data } = await supabase.from('client_passwords').select('*').eq('client_id', id).order('service_name');
    if (data) setPasswords(data);
  };

  const fetchFolders = async () => {
    const { data } = await supabase.from('client_folders').select('*').eq('client_id', id).order('folder_type, name');
    if (data) setFolders(data);
  };

  const fetchDriveFolder = async () => {
    const { data } = await supabase.from('client_drive_folders').select('*').eq('client_id', id).limit(1).maybeSingle();
    if (data) setDriveFolder(data);
  };

  const extractFolderIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleLinkDriveFolder = async () => {
    const folderId = extractFolderIdFromUrl(driveLinkInput) || driveLinkInput.trim();
    if (!folderId) { toast({ variant: 'destructive', title: 'ID da pasta inválido' }); return; }
    if (driveFolder) {
      const { error } = await supabase.from('client_drive_folders').update({ folder_id: folderId, folder_name: 'Pasta Principal' }).eq('id', driveFolder.id);
      if (error) { toast({ variant: 'destructive', title: 'Erro ao atualizar pasta', description: error.message }); }
      else { setDriveFolder({ ...driveFolder, folder_id: folderId }); setIsDriveLinkDialogOpen(false); setDriveLinkInput(''); toast({ title: 'Pasta do Drive atualizada!' }); }
    } else {
      const { data, error } = await supabase.from('client_drive_folders').insert({ client_id: id, folder_id: folderId, folder_name: 'Pasta Principal', created_by: user?.id }).select().single();
      if (error) { toast({ variant: 'destructive', title: 'Erro ao vincular pasta', description: error.message }); }
      else { setDriveFolder(data); setIsDriveLinkDialogOpen(false); setDriveLinkInput(''); toast({ title: 'Pasta do Drive vinculada!' }); }
    }
  };

  const togglePasswordVisibility = (passwordId: string) => {
    setVisiblePasswords(prev => { const s = new Set(prev); s.has(passwordId) ? s.delete(passwordId) : s.add(passwordId); return s; });
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast({ title: 'Copiado!' }); };

  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.service_name || !passwordForm.password) { toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios' }); return; }
    const encrypted = await encryptPassword(passwordForm.password);
    if (editingPassword) {
      const { error } = await supabase.from('client_passwords').update({ service_name: passwordForm.service_name, username: passwordForm.username || null, encrypted_password: encrypted, notes: passwordForm.notes || null }).eq('id', editingPassword.id);
      if (error) { toast({ variant: 'destructive', title: 'Erro ao atualizar senha', description: error.message }); }
      else { toast({ title: 'Senha atualizada!' }); setIsPasswordDialogOpen(false); setEditingPassword(null); setPasswordForm({ service_name: '', username: '', password: '', notes: '' }); fetchPasswords(); }
    } else {
      const { error } = await supabase.from('client_passwords').insert({ client_id: id, service_name: passwordForm.service_name, username: passwordForm.username || null, encrypted_password: encrypted, notes: passwordForm.notes || null, created_by: user?.id });
      if (error) { toast({ variant: 'destructive', title: 'Erro ao salvar senha', description: error.message }); }
      else { toast({ title: 'Senha salva!' }); setIsPasswordDialogOpen(false); setPasswordForm({ service_name: '', username: '', password: '', notes: '' }); fetchPasswords(); }
    }
  };

  const handleEditPassword = async (pwd: ClientPassword) => {
    setEditingPassword(pwd);
    const plaintext = await decryptPassword(pwd.encrypted_password);
    setPasswordForm({ service_name: pwd.service_name, username: pwd.username || '', password: plaintext, notes: pwd.notes || '' });
    setIsPasswordDialogOpen(true);
  };

  const handleDeletePassword = async (passwordId: string) => {
    const { error } = await supabase.from('client_passwords').delete().eq('id', passwordId);
    if (!error) { toast({ title: 'Senha removida!' }); fetchPasswords(); }
    else { toast({ variant: 'destructive', title: 'Erro', description: error.message }); }
    setConfirmDialog({ open: false, type: 'folder', id: '', name: '' });
  };

  const handleAddColor = async () => {
    if (!client) return;
    const newPalette = [...client.color_palette, newColor];
    const { error } = await supabase.from('clients').update({ color_palette: newPalette }).eq('id', id);
    if (!error) { setClient({ ...client, color_palette: newPalette }); setIsColorDialogOpen(false); toast({ title: 'Cor adicionada!' }); }
    else { toast({ variant: 'destructive', title: 'Erro ao adicionar cor' }); }
  };

  const handleRemoveColor = async (index: number) => {
    if (!client) return;
    const newPalette = client.color_palette.filter((_, i) => i !== index);
    const { error } = await supabase.from('clients').update({ color_palette: newPalette }).eq('id', id);
    if (!error) { setClient({ ...client, color_palette: newPalette }); toast({ title: 'Cor removida!' }); }
    setConfirmDialog({ open: false, type: 'folder', id: '', name: '' });
  };

  const handleLogoUpload = async (url: string) => {
    if (!client) return;
    const { error } = await supabase.from('clients').update({ logo_url: url || null }).eq('id', id);
    if (!error) { setClient({ ...client, logo_url: url || null }); toast({ title: url ? 'Logo atualizado!' : 'Logo removido!' }); }
    else { toast({ variant: 'destructive', title: 'Erro ao salvar logo', description: error.message }); }
  };

  const handleDownloadLogo = async () => {
    if (!client?.logo_url) return;
    try {
      const response = await fetch(client.logo_url);
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
    } catch { toast({ variant: 'destructive', title: 'Erro ao baixar logo' }); }
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderForm.name) { toast({ variant: 'destructive', title: 'Nome é obrigatório' }); return; }
    const { error } = await supabase.from('client_folders').insert({ client_id: id, folder_type: currentFolderType, name: folderForm.name, description: folderForm.description || null, file_url: folderForm.file_url || null, created_by: user?.id });
    if (!error) { toast({ title: 'Arquivo adicionado!' }); setIsFolderDialogOpen(false); setFolderForm({ name: '', description: '', file_url: '' }); fetchFolders(); }
    else { toast({ variant: 'destructive', title: 'Erro', description: error.message }); }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const { error } = await supabase.from('client_folders').delete().eq('id', folderId);
    if (!error) { toast({ title: 'Arquivo removido!' }); fetchFolders(); }
    setConfirmDialog({ open: false, type: 'folder', id: '', name: '' });
  };

  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !socialForm.url.trim()) { toast({ variant: 'destructive', title: 'URL é obrigatória' }); return; }
    try { new URL(socialForm.url); } catch { toast({ variant: 'destructive', title: 'URL inválida' }); return; }
    const newLinks = { ...client.social_links, [socialForm.platform]: socialForm.url };
    const { error } = await supabase.from('clients').update({ social_links: newLinks }).eq('id', id);
    if (!error) { setClient({ ...client, social_links: newLinks }); setIsSocialDialogOpen(false); setSocialForm({ platform: 'instagram', url: '' }); toast({ title: 'Link adicionado!' }); }
    else { toast({ variant: 'destructive', title: 'Erro ao adicionar link' }); }
  };

  const handleRemoveSocialLink = async (platform: string) => {
    if (!client) return;
    const newLinks = { ...client.social_links }; delete newLinks[platform];
    const { error } = await supabase.from('clients').update({ social_links: newLinks }).eq('id', id);
    if (!error) { setClient({ ...client, social_links: newLinks }); toast({ title: 'Link removido!' }); }
    setConfirmDialog({ open: false, type: 'folder', id: '', name: '' });
  };

  const openEditDialog = () => {
    if (!client) return;
    setEditForm({ name: client.name || '', segment: client.segment || '', contact_name: client.contact_name || '', contact_email: client.contact_email || '', contact_phone: client.contact_phone || '', google_drive_link: client.google_drive_link || '', canva_link: client.canva_link || '', notes: client.notes || '' });
    setIsEditDialogOpen(true);
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) { toast({ variant: 'destructive', title: 'Nome é obrigatório' }); return; }
    const { error } = await supabase.from('clients').update({ name: editForm.name.trim(), segment: editForm.segment || null, contact_name: editForm.contact_name || null, contact_email: editForm.contact_email || null, contact_phone: editForm.contact_phone || null, google_drive_link: editForm.google_drive_link || null, canva_link: editForm.canva_link || null, notes: editForm.notes || null }).eq('id', id);
    if (!error) {
      setClient({ ...client!, name: editForm.name.trim(), segment: editForm.segment || null, contact_name: editForm.contact_name || null, contact_email: editForm.contact_email || null, contact_phone: editForm.contact_phone || null, google_drive_link: editForm.google_drive_link || null, canva_link: editForm.canva_link || null, notes: editForm.notes || null });
      setIsEditDialogOpen(false); toast({ title: 'Cliente atualizado!' });
    } else { toast({ variant: 'destructive', title: 'Erro', description: error.message }); }
  };

  const handleDeleteClient = async () => {
    if (!id || !isAdminOrManager) return;
    setIsDeletingClient(true);
    try {
      await supabase.from('client_passwords').delete().eq('client_id', id);
      await supabase.from('client_folders').delete().eq('client_id', id);
      await supabase.from('client_drive_folders').delete().eq('client_id', id);
      await supabase.from('tasks').delete().eq('client_id', id);
      await supabase.from('calendar_events').delete().eq('client_id', id);
      await supabase.from('filmmaker_demands').delete().eq('client_id', id);
      await supabase.from('filmmaker_visits').delete().eq('client_id', id);
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (!error) { toast({ title: 'Cliente excluído!' }); navigate('/clients'); }
      else { toast({ variant: 'destructive', title: 'Erro', description: error.message }); }
    } catch { toast({ variant: 'destructive', title: 'Erro ao excluir cliente' }); }
    finally { setIsDeletingClient(false); }
  };

  const handleConfirmAction = () => {
    const { type, id: actionId, index } = confirmDialog;
    switch (type) {
      case 'folder': handleDeleteFolder(actionId); break;
      case 'color': if (index !== undefined) handleRemoveColor(index); break;
      case 'social': handleRemoveSocialLink(actionId); break;
      case 'password': handleDeletePassword(actionId); break;
    }
  };

  if (!client) {
    return (
      <div className="space-y-6 animate-in">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-start gap-5">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <ClientHeader
        client={client}
        clientId={id!}
        isAdminOrManager={isAdminOrManager}
        onLogoUpload={handleLogoUpload}
        onEdit={openEditDialog}
        onDelete={() => setIsDeleteClientDialogOpen(true)}
        onBack={() => navigate('/clients')}
        onCopyToClipboard={copyToClipboard}
        onDownloadLogo={handleDownloadLogo}
      />

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full justify-start bg-secondary/50 p-1 rounded-xl gap-1">
          <TabsTrigger value="info" className="gap-1.5 rounded-lg text-xs data-[state=active]:shadow-sm">
            <Info className="h-3.5 w-3.5" />
            Info
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5 rounded-lg text-xs data-[state=active]:shadow-sm">
            <Share2 className="h-3.5 w-3.5" />
            Social
          </TabsTrigger>
          <TabsTrigger value="palette" className="gap-1.5 rounded-lg text-xs data-[state=active]:shadow-sm">
            <Palette className="h-3.5 w-3.5" />
            Cores
          </TabsTrigger>
          <TabsTrigger value="folders" className="gap-1.5 rounded-lg text-xs data-[state=active]:shadow-sm">
            <FolderOpen className="h-3.5 w-3.5" />
            Pastas
          </TabsTrigger>
          <TabsTrigger value="drive" className="gap-1.5 rounded-lg text-xs data-[state=active]:shadow-sm">
            <HardDrive className="h-3.5 w-3.5" />
            Drive
          </TabsTrigger>
          {isAdminOrManager && (
            <TabsTrigger value="passwords" className="gap-1.5 rounded-lg text-xs data-[state=active]:shadow-sm">
              <Lock className="h-3.5 w-3.5" />
              Senhas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <ClientInfoTab
            client={client}
            isEditDialogOpen={isEditDialogOpen}
            setIsEditDialogOpen={setIsEditDialogOpen}
            editForm={editForm}
            setEditForm={setEditForm}
            onOpenEditDialog={openEditDialog}
            onEditClient={handleEditClient}
          />
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <ClientSocialTab
            socialLinks={client.social_links}
            isSocialDialogOpen={isSocialDialogOpen}
            setIsSocialDialogOpen={setIsSocialDialogOpen}
            socialForm={socialForm}
            setSocialForm={setSocialForm}
            onAddSocialLink={handleAddSocialLink}
            onRemoveSocialLink={(platform) => setConfirmDialog({ open: true, type: 'social', id: platform, name: platform })}
          />
        </TabsContent>

        <TabsContent value="palette" className="mt-4">
          <ClientPaletteTab
            colorPalette={client.color_palette}
            isColorDialogOpen={isColorDialogOpen}
            setIsColorDialogOpen={setIsColorDialogOpen}
            newColor={newColor}
            setNewColor={setNewColor}
            onAddColor={handleAddColor}
            onRemoveColor={(index, color) => setConfirmDialog({ open: true, type: 'color', id: '', name: color, index })}
            onCopyToClipboard={copyToClipboard}
          />
        </TabsContent>

        <TabsContent value="folders" className="mt-4">
          <ClientFoldersTab
            folders={folders}
            clientId={id!}
            isAdminOrManager={isAdminOrManager}
            isFolderDialogOpen={isFolderDialogOpen}
            setIsFolderDialogOpen={setIsFolderDialogOpen}
            currentFolderType={currentFolderType}
            setCurrentFolderType={setCurrentFolderType}
            folderForm={folderForm}
            setFolderForm={setFolderForm}
            onAddFolder={handleAddFolder}
            onDeleteFolder={(folderId, name) => setConfirmDialog({ open: true, type: 'folder', id: folderId, name })}
          />
        </TabsContent>

        <TabsContent value="drive" className="mt-4">
          <ClientDriveTab
            driveFolder={driveFolder}
            isDriveLinkDialogOpen={isDriveLinkDialogOpen}
            setIsDriveLinkDialogOpen={setIsDriveLinkDialogOpen}
            driveLinkInput={driveLinkInput}
            setDriveLinkInput={setDriveLinkInput}
            onLinkDriveFolder={handleLinkDriveFolder}
          />
        </TabsContent>

        {isAdminOrManager && (
          <TabsContent value="passwords" className="mt-4">
            <ClientPasswordsTab
              passwords={passwords}
              visiblePasswords={visiblePasswords}
              isPasswordDialogOpen={isPasswordDialogOpen}
              setIsPasswordDialogOpen={setIsPasswordDialogOpen}
              editingPassword={editingPassword}
              passwordForm={passwordForm}
              setPasswordForm={setPasswordForm}
              onToggleVisibility={togglePasswordVisibility}
              onCopyToClipboard={copyToClipboard}
              onAddPassword={handleAddPassword}
              onEditPassword={handleEditPassword}
              onDeletePassword={(pwdId, name) => setConfirmDialog({ open: true, type: 'password', id: pwdId, name })}
              onResetForm={() => { setEditingPassword(null); setPasswordForm({ service_name: '', username: '', password: '', notes: '' }); }}
            />
          </TabsContent>
        )}
      </Tabs>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.type === 'folder' ? 'Excluir arquivo' : confirmDialog.type === 'color' ? 'Remover cor' : confirmDialog.type === 'password' ? 'Excluir senha' : 'Remover link'}
        description={
          confirmDialog.type === 'folder' ? `Excluir "${confirmDialog.name}"? Esta ação não pode ser desfeita.` :
          confirmDialog.type === 'color' ? `Remover a cor ${confirmDialog.name} da paleta?` :
          confirmDialog.type === 'password' ? `Excluir a senha do serviço "${confirmDialog.name}"?` :
          `Remover o link do ${confirmDialog.name}?`
        }
        confirmText="Remover"
        onConfirm={handleConfirmAction}
        variant="destructive"
      />

      <ConfirmDialog
        open={isDeleteClientDialogOpen}
        onOpenChange={setIsDeleteClientDialogOpen}
        title="Excluir Cliente"
        description={`Excluir "${client.name}" e TODOS os dados relacionados permanentemente?`}
        confirmText="Excluir Permanentemente"
        onConfirm={handleDeleteClient}
        variant="destructive"
        isLoading={isDeletingClient}
      />
    </div>
  );
}
