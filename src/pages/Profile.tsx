import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Loader2, Save, User } from "lucide-react";

export default function Profile() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("client-files")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("client-files")
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      setFormData((prev) => ({ ...prev, avatar_url: avatarUrl }));
      
      toast({
        title: "Sucesso",
        description: "Foto atualizada com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    if (!formData.full_name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
          avatar_url: formData.avatar_url || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso",
      });

      // Reload to refresh context
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-28 w-28 border-2 border-border">
                  <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                  <AvatarFallback className="text-2xl bg-muted">
                    {formData.full_name ? getInitials(formData.full_name) : <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Clique na foto para alterar
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium">
                  Nome completo
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar alterações
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
