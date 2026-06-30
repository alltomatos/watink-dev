import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Upload, Pencil, Trash2, ShieldAlert, ShieldCheck, Loader2, Network, Wifi, Gauge } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import type { Proxy, ProxyGroup } from "../../../types/domain";
import ProxyFormDialog from "../../Proxies/ProxyFormDialog";
import ProxyImportDialog from "../../Proxies/ProxyImportDialog";
import ProxyGroupsPanel from "../../Proxies/ProxyGroupsPanel";
import ConnectionGroupsDialog from "../../Proxies/ConnectionGroupsDialog";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  isolated: { label: "Isolado", variant: "destructive" },
  banned: { label: "Banido", variant: "destructive" },
  disabled: { label: "Desativado", variant: "secondary" },
};

const ProxySection: React.FC = () => {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [groups, setGroups] = useState<ProxyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [connGroupsOpen, setConnGroupsOpen] = useState(false);
  const [editing, setEditing] = useState<Proxy | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchProxies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Proxy[]>("/proxies");
      setProxies(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await api.get<ProxyGroup[]>("/proxy-groups");
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => { fetchProxies(); fetchGroups(); }, [fetchProxies, fetchGroups]);

  const groupName = (id?: number | null) =>
    id == null ? "—" : groups.find((g) => g.id === id)?.name ?? `#${id}`;

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: Proxy) => { setEditing(p); setFormOpen(true); };

  const handleToggleIsolate = async (p: Proxy) => {
    const action = p.status === "isolated" ? "activate" : "isolate";
    try {
      await api.post(`/proxies/${p.id}/${action}`);
      toast.success(action === "isolate" ? "Proxy isolado." : "Proxy reativado.");
      fetchProxies();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async (p: Proxy) => {
    if (!window.confirm(`Remover o proxy ${p.host}:${p.port}?`)) return;
    try {
      await api.delete(`/proxies/${p.id}`);
      toast.success("Proxy removido.");
      fetchProxies();
    } catch (err) {
      toastError(err);
    }
  };

  const handleTestAll = async () => {
    setTestingAll(true);
    try {
      const { data } = await api.post<{ tested: number; ok: number; failed: number }>("/proxies/test-all");
      if (data.tested === 0) {
        toast.info("Nenhum proxy para testar.");
      } else {
        toast.success(`Teste concluído: ${data.ok}/${data.tested} OK · ${data.failed} invalidados`);
      }
      fetchProxies();
    } catch (err) {
      toastError(err);
    } finally {
      setTestingAll(false);
    }
  };

  const handleDeleteAll = async () => {
    if (proxies.length === 0) { toast.info("Nenhum proxy para remover."); return; }
    if (!window.confirm(`Remover TODOS os ${proxies.length} proxies? As conexões vinculadas serão desvinculadas.`)) return;
    setDeletingAll(true);
    try {
      const { data } = await api.delete<{ deleted: number }>("/proxies");
      toast.success(`${data.deleted} proxies removidos.`);
      fetchProxies();
    } catch (err) {
      toastError(err);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleTest = async (p: Proxy) => {
    setTestingId(p.id);
    try {
      const { data } = await api.post<{ ok: boolean; ip?: string; latencyMs?: number; error?: string }>(`/proxies/${p.id}/test`);
      if (data.ok) {
        toast.success(`Proxy OK — IP ${data.ip} (${data.latencyMs}ms)`);
      } else {
        toast.error(`Proxy falhou: ${data.error || "sem resposta"}`);
      }
      fetchProxies();
    } catch (err) {
      toastError(err);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Proxy</h2>
          <p className="text-sm text-muted-foreground">
            Pool de proxies para isolamento de IP por conexão (anti-ban). Atrele um proxy a uma conexão na página de Conexões.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setConnGroupsOpen(true)}>
            <Network className="mr-2 h-4 w-4" /> Grupos de Conexões
          </Button>
          <Button variant="outline" onClick={handleTestAll} disabled={testingAll}>
            {testingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gauge className="mr-2 h-4 w-4" />}
            Testar todos
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDeleteAll} disabled={deletingAll}>
            {deletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Deletar todos
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar em massa
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Novo proxy
          </Button>
        </div>
      </div>

      <ProxyGroupsPanel onChanged={() => { fetchProxies(); fetchGroups(); }} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : proxies.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-16">
          Nenhum proxy cadastrado. Importe sua lista ou crie um manualmente.
        </div>
      ) : (
        <div className="rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.08)] bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rótulo</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proxies.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? { label: p.status, variant: "outline" as const };
                const isIsolated = p.status === "isolated";
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.label || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.scheme}://{p.host}:{p.port}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{groupName(p.proxyGroupId)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.username || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${p.healthy ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                          title={p.healthy ? "Último teste: OK" : "Não testado / sem resposta"}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Testar conexão" disabled={testingId === p.id} onClick={() => handleTest(p)}>
                          {testingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={isIsolated ? "Reativar" : "Isolar (IP queimado)"}
                          onClick={() => handleToggleIsolate(p)}
                        >
                          {isIsolated ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Remover" onClick={() => handleDelete(p)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ProxyFormDialog open={formOpen} proxy={editing} groups={groups} onClose={() => setFormOpen(false)} onSaved={fetchProxies} />
      <ProxyImportDialog open={importOpen} groups={groups} onClose={() => setImportOpen(false)} onImported={fetchProxies} />
      <ConnectionGroupsDialog open={connGroupsOpen} onClose={() => setConnGroupsOpen(false)} />
    </div>
  );
};

export default ProxySection;
