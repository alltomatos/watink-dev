import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import type { ProxyGroup } from "../../types/domain";

interface ProxyGroupsPanelProps {
  onChanged: () => void;
}

const ROTATION_LABEL: Record<string, string> = {
  sticky: "Fixo (sticky)",
  rotate: "Rotação",
};

const ProxyGroupsPanel: React.FC<ProxyGroupsPanelProps> = ({ onChanged }) => {
  const [groups, setGroups] = useState<ProxyGroup[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProxyGroup | null>(null);
  const [name, setName] = useState("");
  const [rotation, setRotation] = useState("sticky");
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await api.get<ProxyGroup[]>("/proxy-groups");
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const openCreate = () => { setEditing(null); setName(""); setRotation("sticky"); setDialogOpen(true); };
  const openEdit = (g: ProxyGroup) => { setEditing(g); setName(g.name); setRotation(g.rotationStrategy); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) { toast.warning("Nome é obrigatório."); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/proxy-groups/${editing.id}`, { name, rotationStrategy: rotation });
      } else {
        await api.post("/proxy-groups", { name, rotationStrategy: rotation });
      }
      toast.success("Grupo salvo.");
      setDialogOpen(false);
      fetchGroups();
      onChanged();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: ProxyGroup) => {
    if (!window.confirm(`Remover o grupo "${g.name}"? Os proxies serão desvinculados.`)) return;
    try {
      await api.delete(`/proxy-groups/${g.id}`);
      toast.success("Grupo removido.");
      fetchGroups();
      onChanged();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] bg-card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4" /> Grupos de Proxy
        </p>
        <Button variant="outline" size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Novo grupo
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum grupo. Crie um pool para rotacionar IPs entre conexões.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
              <span className="text-sm font-medium">{g.name}</span>
              <Badge variant="secondary">{ROTATION_LABEL[g.rotationStrategy] ?? g.rotationStrategy}</Badge>
              <span className="text-xs text-muted-foreground">{g.activeProxyCount ?? 0}/{g.proxyCount ?? 0} ativos</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Editar" onClick={() => openEdit(g)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Remover" onClick={() => handleDelete(g)}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar grupo" : "Novo grupo de proxy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: residenciais-BR" />
            </div>
            <div className="space-y-1">
              <Label>Estratégia de rotação</Label>
              <Select value={rotation} onValueChange={setRotation}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sticky">Fixo — mesmo IP por conexão</SelectItem>
                  <SelectItem value="rotate">Rotação — troca de IP a cada reconexão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProxyGroupsPanel;
