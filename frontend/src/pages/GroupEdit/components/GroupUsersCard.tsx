import React from "react";
import { Search, UserPlus, Trash2, Users } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import Avatar from "../../../components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import type { GroupUser } from "../groupEditTypes";

interface GroupUsersCardProps {
  filteredGroupUsers: GroupUser[];
  groupUsersCount: number;
  userSearchTerm: string;
  onSearchChange: (v: string) => void;
  onRemoveUser: (id: string) => void;
  onOpenAddDialog: () => void;
}

const GroupUsersCard: React.FC<GroupUsersCardProps> = ({
  filteredGroupUsers,
  groupUsersCount,
  userSearchTerm,
  onSearchChange,
  onRemoveUser,
  onOpenAddDialog,
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/20 text-success">
          <Users className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold">Usuários do Grupo</span>
        <Badge className="ml-auto" variant="secondary">
          {groupUsersCount}
        </Badge>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar usuários..."
          value={userSearchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <ul className="max-h-[280px] space-y-1 overflow-y-auto">
        {filteredGroupUsers.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
            <Users className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum usuário no grupo</p>
          </div>
        ) : (
          filteredGroupUsers.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-accent"
            >
              <Avatar name={u.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onRemoveUser(u.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remover do grupo</TooltipContent>
              </Tooltip>
            </li>
          ))
        )}
      </ul>

      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full rounded-lg"
        onClick={onOpenAddDialog}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Adicionar Usuário
      </Button>
    </div>
  );
};

export default GroupUsersCard;
