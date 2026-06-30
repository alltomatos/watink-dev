import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import type { Proxy, ProxyGroup } from "../../types/domain";

interface ProxyFormDialogProps {
  open: boolean;
  proxy: Proxy | null;
  groups: ProxyGroup[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  label: string;
  scheme: string;
  host: string;
  port: string;
  username: string;
  password: string;
  notes: string;
  group: string;
}

const EMPTY: FormState = {
  label: "",
  scheme: "http",
  host: "",
  port: "",
  username: "",
  password: "",
  notes: "",
  group: "none",
};

const ProxyFormDialog: React.FC<ProxyFormDialogProps> = ({ open, proxy, groups, onClose, onSaved }) => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = !!proxy;

  useEffect(() => {
    if (proxy) {
      setForm({
        label: proxy.label ?? "",
        scheme: proxy.scheme ?? "http",
        host: proxy.host ?? "",
        port: String(proxy.port ?? ""),
        username: proxy.username ?? "",
        password: "", // never pre-fill — backend masks the secret
        notes: proxy.notes ?? "",
        group: proxy.proxyGroupId != null ? String(proxy.proxyGroupId) : "none",
      });
    } else {
      setForm(EMPTY);
    }
  }, [proxy, open]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.host.trim() || !form.port.trim()) {
      toast.warning("Host e porta são obrigatórios.");
      return;
    }
    const payload = {
      label: form.label,
      scheme: form.scheme,
      host: form.host.trim(),
      port: Number(form.port),
      username: form.username,
      password: form.password, // empty on edit = keep current
      notes: form.notes,
      proxyGroupId: form.group === "none" ? null : Number(form.group),
    };
    setSaving(true);
    try {
      if (isEdit && proxy) {
        await api.put(`/proxies/${proxy.id}`, payload);
      } else {
        await api.post("/proxies", payload);
      }
      toast.success(isEdit ? "Proxy atualizado." : "Proxy criado.");
      onSaved();
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar proxy" : "Novo proxy"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Rótulo</Label>
            <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="ex: residencial-BR-1" />
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={form.scheme} onValueChange={(v) => set("scheme", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="socks5">SOCKS5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <Label>Host</Label>
              <Input value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="38.154.193.44" />
            </div>
            <div className="space-y-1">
              <Label>Porta</Label>
              <Input value={form.port} onChange={(e) => set("port", e.target.value)} placeholder="5317" inputMode="numeric" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Usuário</Label>
            <Input value={form.username} onChange={(e) => set("username", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Senha {isEdit && proxy?.hasPassword && <span className="text-xs text-muted-foreground">(deixe vazio para manter)</span>}</Label>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={isEdit && proxy?.hasPassword ? "••••••••" : ""} />
          </div>

          <div className="space-y-1">
            <Label>Grupo</Label>
            <Select value={form.group} onValueChange={(v) => set("group", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem grupo</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProxyFormDialog;
