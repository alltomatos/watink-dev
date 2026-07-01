import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SetorListItem, UserSetorVinculo } from "../acessosTypes";

interface UserSetoresSectionProps {
  setores: SetorListItem[];
  vinculos: UserSetorVinculo[];
  onChange: (vinculos: UserSetorVinculo[]) => void;
}

/**
 * Chip por Setor + toggle "é gestor deste setor" (ADR 0022 — um usuário pode
 * ser gestor de múltiplos Setores simultaneamente).
 */
const UserSetoresSection: React.FC<UserSetoresSectionProps> = ({ setores, vinculos, onChange }) => {
  const isChecked = (setorId: number) => vinculos.some((v) => v.setorId === setorId);
  const isGestor = (setorId: number) => vinculos.find((v) => v.setorId === setorId)?.ehGestor ?? false;

  const toggleSetor = (setorId: number, checked: boolean) => {
    if (checked) {
      onChange([...vinculos, { setorId, ehGestor: false }]);
    } else {
      onChange(vinculos.filter((v) => v.setorId !== setorId));
    }
  };

  const toggleGestor = (setorId: number, ehGestor: boolean) => {
    onChange(vinculos.map((v) => (v.setorId === setorId ? { ...v, ehGestor } : v)));
  };

  if (setores.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum setor cadastrado ainda.</p>;
  }

  return (
    <div className="space-y-1.5">
      <Label>Setores &amp; Gestão</Label>
      <div className="space-y-1 rounded-xl bg-muted/40 p-2">
        {setores.map((setor) => {
          const checked = isChecked(setor.id);
          return (
            <div
              key={setor.id}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50"
            >
              <label className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-0">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggleSetor(setor.id, !!v)}
                />
                <span className="truncate">{setor.name}</span>
              </label>
              {checked && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                  <Checkbox
                    checked={isGestor(setor.id)}
                    onCheckedChange={(v) => toggleGestor(setor.id, !!v)}
                  />
                  Gestor deste setor
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserSetoresSection;
