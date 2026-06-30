import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2, Check, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import type { ConnectionGroup } from "../../types/domain";

interface ConnectionGroupsDialogProps {
  open: boolean;
  onClose: () => void;
}

const ConnectionGroupsDialog: React.FC<ConnectionGroupsDialogProps> = ({ open, onClose }) => {
  const [groups, setGroups] = useState<ConnectionGroup[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await api.get<ConnectionGroup[]>("/connection-groups");
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => { if (open) fetchGroups(); }, [open, fetchGroups]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await api.post("/connection-groups", { name: newName });
      setNewName("");
      fetchGroups();
    } catch (err) {
      toastError(err);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      await api.put(`/connection-groups/${id}`, { name: editingName });
      setEditingId(null);
      fetchGroups();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async (g: ConnectionGroup) => {
    if (!window.confirm(`Remover o grupo "${g.name}"? As conexões serão desvinculadas.`)) return;
    try {
      await api.delete(`/connection-groups/${g.id}`);
      toast.success("Grupo removido.");
      fetchGroups();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Grupos de Conexões</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do novo grupo"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <Button onClick={handleCreate}><Plus className="h-4 w-4" /></Button>
          </div>

          {groups.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum grupo de conexões.</p>
          ) : (
            <div className="space-y-1">
              {groups.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-1.5">
                  {editingId === g.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="h-7" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveEdit(g.id)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="text-sm text-left flex-1 hover:underline"
                        onClick={() => { setEditingId(g.id); setEditingName(g.name); }}
                      >
                        {g.name} <span className="text-xs text-muted-foreground">({g.connectionCount ?? 0})</span>
                      </button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(g)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionGroupsDialog;
