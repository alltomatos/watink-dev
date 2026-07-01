import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import SetorMembersList from "./SetorMembersList";
import SetorAddMemberRow from "./SetorAddMemberRow";
import SetorQueuesSection from "./SetorQueuesSection";
import type { SetorDetail } from "../acessosTypes";

interface SetorPanelProps {
  open: boolean;
  loading: boolean;
  editingSetor: SetorDetail | null;
  onClose: () => void;
  onSaveName: (id: number | null, name: string) => Promise<boolean>;
  onAddMember: (setorId: number, userId: number, ehGestor: boolean) => Promise<void>;
  onToggleMember: (setorId: number, userId: number, ehGestor: boolean) => Promise<void>;
  onRemoveMember: (setorId: number, userId: number) => Promise<void>;
  onSetQueues: (setorId: number, queueIds: number[]) => Promise<void>;
}

const SetorPanel: React.FC<SetorPanelProps> = ({
  open,
  loading,
  editingSetor,
  onClose,
  onSaveName,
  onAddMember,
  onToggleMember,
  onRemoveMember,
  onSetQueues,
}) => {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(editingSetor?.name ?? "");
  }, [editingSetor]);

  const isNew = !editingSetor;

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await onSaveName(editingSetor?.id ?? null, name);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>{isNew ? "Novo Setor" : "Editar Setor"}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="setor-name">Nome</Label>
              <div className="flex gap-2">
                <Input
                  id="setor-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Button type="button" onClick={handleSaveName} disabled={saving || !name.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isNew ? "Criar" : "Salvar"}
                </Button>
              </div>
            </div>

            {!isNew && editingSetor && (
              <>
                <div className="space-y-2">
                  <Label>Membros</Label>
                  <SetorMembersList
                    members={editingSetor.members}
                    onToggleGestor={(userId, ehGestor) =>
                      onToggleMember(editingSetor.id, userId, ehGestor)
                    }
                    onRemove={(userId) => onRemoveMember(editingSetor.id, userId)}
                  />
                  <SetorAddMemberRow
                    existingMembers={editingSetor.members}
                    onAdd={(userId, ehGestor) => onAddMember(editingSetor.id, userId, ehGestor)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Filas vinculadas</Label>
                  <SetorQueuesSection
                    linkedQueues={editingSetor.queues}
                    onSave={(queueIds) => onSetQueues(editingSetor.id, queueIds)}
                  />
                </div>
              </>
            )}

            {isNew && (
              <p className="text-xs text-muted-foreground">
                Salve o nome para poder gerenciar membros e filas deste setor.
              </p>
            )}
          </div>
        )}

        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default SetorPanel;
