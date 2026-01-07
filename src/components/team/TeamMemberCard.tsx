import { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, UserCog, User, Video, Palette, Trash2, Phone, Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type AppRole = 'admin' | 'gerente' | 'colaborador' | 'filmmaker' | 'designer';

interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: AppRole;
}

interface TeamMemberCardProps {
  member: TeamMember;
  isAdmin: boolean;
  isCurrentUser: boolean;
  onRoleChange: (userId: string, role: AppRole) => void;
  onRemove: (userId: string, name: string) => void;
  onAvatarUpdate?: () => void;
}

const roleConfig: Record<AppRole, { 
  icon: typeof Shield; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  admin: { 
    icon: Shield, 
    label: 'Administrador', 
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  gerente: { 
    icon: UserCog, 
    label: 'Gerente', 
    color: 'text-info',
    bgColor: 'bg-info/10'
  },
  filmmaker: { 
    icon: Video, 
    label: 'Filmmaker', 
    color: 'text-warning',
    bgColor: 'bg-warning/10'
  },
  designer: { 
    icon: Palette, 
    label: 'Designer', 
    color: 'text-success',
    bgColor: 'bg-success/10'
  },
  colaborador: { 
    icon: User, 
    label: 'Colaborador', 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  },
};

export function TeamMemberCard({
  member,
  isAdmin,
  isCurrentUser,
  onRoleChange,
  onRemove,
  onAvatarUpdate,
}: TeamMemberCardProps) {
  const config = roleConfig[member.role];
  const RoleIcon = config.icon;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(member.avatar_url);
  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarClick = () => {
    if (isAdmin || isCurrentUser) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const fileName = `${member.user_id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("client-files")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("client-files")
        .getPublicUrl(fileName);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      // Update profile in database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("user_id", member.user_id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      onAvatarUpdate?.();
      
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

  return (
    <Card className={cn(
      "group hover:shadow-md transition-all duration-200 overflow-hidden",
      isCurrentUser && "ring-2 ring-primary/20"
    )}>
      {/* Role indicator bar */}
      <div className={cn("h-1", config.bgColor)} />
      
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar with upload */}
          <div className="relative group/avatar">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Avatar 
              className={cn(
                "h-14 w-14 ring-2 ring-background shadow-md",
                (isAdmin || isCurrentUser) && "cursor-pointer"
              )}
              onClick={handleAvatarClick}
            >
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className={cn("text-lg font-medium", config.bgColor, config.color)}>
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>
            
            {/* Upload overlay */}
            {(isAdmin || isCurrentUser) && (
              <div 
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 transition-opacity cursor-pointer",
                  isUploading ? "opacity-100" : "opacity-0 group-hover/avatar:opacity-100"
                )}
                onClick={handleAvatarClick}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            )}
            
            {/* Role indicator */}
            <div className={cn(
              "absolute -bottom-1 -right-1 p-1 rounded-full",
              config.bgColor
            )}>
              <RoleIcon className={cn("h-3.5 w-3.5", config.color)} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm truncate">
                {member.full_name}
              </h4>
              {isCurrentUser && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Você
                </Badge>
              )}
            </div>
            
            {member.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                {member.phone}
              </p>
            )}

            {/* Role Badge or Selector */}
            <div className="pt-1">
              {isAdmin && !isCurrentUser ? (
                <Select
                  value={member.role}
                  onValueChange={(value: AppRole) => onRoleChange(member.user_id, value)}
                >
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="filmmaker">Filmmaker</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", config.bgColor, config.color)}
                >
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          {isAdmin && !isCurrentUser && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRemove(member.user_id, member.full_name)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
