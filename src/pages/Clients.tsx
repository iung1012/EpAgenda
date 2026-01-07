import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Building2, ExternalLink, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { CardSkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';
import { ClientFormDialog, ClientFormValues } from '@/components/forms/ClientFormDialog';
import { useClients } from '@/hooks/useClients';

export default function Clients() {
  const { clients, isLoading, error, refetch } = useClients();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    const { error } = await supabase.from('clients').insert({
      name: data.name,
      segment: data.segment || null,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      google_drive_link: data.google_drive_link || null,
      trello_link: data.trello_link || null,
      notes: data.notes || null,
      created_by: user?.id,
    });
    setIsSubmitting(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao criar cliente', description: error.message });
    } else {
      toast({ title: 'Cliente criado com sucesso!' });
      setIsDialogOpen(false);
      refetch();
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.segment?.toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader 
          title="Clientes" 
          description="Gerencie os clientes da sua agência" 
        />
        <Card>
          <CardContent className="pt-6">
            <ErrorState onRetry={refetch} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader 
        title="Clientes" 
        description="Gerencie os clientes da sua agência"
        action={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        }
      />

      {/* Form Dialog */}
      <ClientFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent>
            <EmptyState
              icon={Building2}
              title="Nenhum cliente encontrado"
              description={search ? 'Tente outra busca' : 'Adicione seu primeiro cliente'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card 
              key={client.id} 
              className="hover-lift cursor-pointer group"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <img 
                        src={client.logo_url} 
                        alt={client.name} 
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{client.name}</CardTitle>
                      {client.segment && (
                        <p className="text-xs text-muted-foreground mt-0.5">{client.segment}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Color Palette Preview */}
                {client.color_palette.length > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    <Palette className="h-3 w-3 text-muted-foreground mr-1" />
                    {client.color_palette.slice(0, 5).map((color, i) => (
                      <div 
                        key={i} 
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}

                {/* Quick Links */}
                <div className="flex gap-2">
                  {client.google_drive_link && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(client.google_drive_link!, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Drive
                    </Button>
                  )}
                  {client.trello_link && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(client.trello_link!, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Trello
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
