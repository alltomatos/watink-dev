import React from "react";
import { Search, UserPlus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import Avatar from "../../../components/ui/avatar";
import type { GroupUser } from "../groupEditTypes";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  availableUsers: GroupUser[];
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onAddUser: (user: GroupUser) => void;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({
  open,
  onOpenChange,
  availableUsers,
  searchTerm,
  onSearchChange,
  onAddUser,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Usuário ao Grupo</DialogTitle>
        </DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar usuário..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <ul className="max-h-[260px] space-y-1 overflow-y-auto">
          {availableUsers.length === 0 ? (
            <li className="py-4 text-center text-sm text-muted-foreground">
              Nenhum usuário disponível
            </li>
          ) : (
            availableUsers.map((u) => (
              <li
                key={u.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-all hover:bg-accent hover:translate-x-1"
                onClick={() => onAddUser(u)}
              >
                <Avatar name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <UserPlus className="h-4 w-4 text-primary" />
              </li>
            ))
          )}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
