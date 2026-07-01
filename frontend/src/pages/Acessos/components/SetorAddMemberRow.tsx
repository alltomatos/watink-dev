import React, { useState, useEffect, useMemo } from "react";
import { Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import type { AcessosUserListItem, SetorMember } from "../acessosTypes";

interface SetorAddMemberRowProps {
  existingMembers: SetorMember[];
  onAdd: (userId: number, ehGestor: boolean) => void;
}

/**
 * Busca usuários do tenant via GET /users (mesmo endpoint da aba Usuários) e
 * permite escolher um para vincular ao Setor como membro, com toggle
 * "é gestor deste setor" antes de confirmar a adição.
 */
const SetorAddMemberRow: React.FC<SetorAddMemberRowProps> = ({ existingMembers, onAdd }) => {
  const [allUsers, setAllUsers] = useState<AcessosUserListItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [ehGestor, setEhGestor] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get<{ users: AcessosUserListItem[] }>("/users");
        setAllUsers(data.users || []);
      } catch (err) {
        toastError(err);
      }
    };
    fetchUsers();
  }, []);

  const existingIds = useMemo(() => new Set(existingMembers.map((m) => m.userId)), [existingMembers]);

  const candidates = allUsers.filter(
    (u) =>
      !existingIds.has(u.id) &&
      (search === "" ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="rounded-xl bg-muted/40 p-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar usuário para adicionar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {search && (
        <ul className="max-h-[160px] space-y-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <li className="py-2 text-center text-xs text-muted-foreground">
              Nenhum usuário disponível
            </li>
          ) : (
            candidates.map((u) => (
              <li
                key={u.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent ${
                  selectedUserId === u.id ? "bg-accent" : ""
                }`}
                onClick={() => setSelectedUserId(u.id)}
              >
                <span className="flex-1 truncate">
                  {u.name} <span className="text-xs text-muted-foreground">{u.email}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}

      {selectedUserId && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={ehGestor} onCheckedChange={(v) => setEhGestor(!!v)} />
            É gestor deste setor
          </label>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onAdd(selectedUserId, ehGestor);
              setSelectedUserId(null);
              setEhGestor(false);
              setSearch("");
            }}
          >
            <UserPlus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
};

export default SetorAddMemberRow;
