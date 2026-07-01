import React from "react";
import { Trash2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Avatar from "@/components/ui/avatar";
import type { SetorMember } from "../acessosTypes";

interface SetorMembersListProps {
  members: SetorMember[];
  onToggleGestor: (userId: number, ehGestor: boolean) => void;
  onRemove: (userId: number) => void;
}

const SetorMembersList: React.FC<SetorMembersListProps> = ({
  members,
  onToggleGestor,
  onRemove,
}) => {
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
        <ShieldCheck className="mb-2 h-8 w-8 opacity-30" />
        <p className="text-sm">Nenhum membro neste setor</p>
      </div>
    );
  }

  return (
    <ul className="max-h-[280px] space-y-1 overflow-y-auto">
      {members.map((m) => (
        <li key={m.userId} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent">
          <Avatar name={m.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{m.name}</p>
            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
            <Checkbox
              checked={m.ehGestor}
              onCheckedChange={(v) => onToggleGestor(m.userId, !!v)}
            />
            Gestor
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onRemove(m.userId)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
};

export default SetorMembersList;
