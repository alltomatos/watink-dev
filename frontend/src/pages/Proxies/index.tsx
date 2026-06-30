import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Upload, Pencil, Trash2, ShieldAlert, ShieldCheck, Loader2, Network } from "lucide-react";

import { PageLayout, PageHeader, PageContent } from "@/components/ui/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import type { Proxy, ProxyGroup } from "../../types/domain";
import ProxyFormDialog from "./ProxyFormDialog";
import ProxyImportDialog from "./ProxyImportDialog";
import ProxyGroupsPanel from "./ProxyGroupsPanel";
import ConnectionGroupsDialog from "./ConnectionGroupsDialog";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  isolated: { label: "Isolado", variant: "destructive" },
  banned: { label: "Banido", variant: "destructive" },
  disabled: { label: "Desativado", variant: "secondary" },
};

const Proxies: React.FC = () => {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [groups, setGroups] = useState<ProxyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [connGroupsOpen, setConnGroupsOpen] = useState(false);
  const [editing, setEditing] = useState<Proxy | null>(null);

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

  return (
    <PageLayout>
      <PageHeader title="Proxies" description="Pool de proxies para isolamento de IP por conexão (anti-ban)">
        <Button variant="outline" onClick={() => setConnGroupsOpen(true)}>
          <Network className="mr-2 h-4 w-4" /> Grupos de Conexões
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Importar em massa
        </Button>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo proxy
        </Button>
      </PageHeader>

      <PageContent>
        <ProxyGroupsPanel onChanged={() => { fetchProxies(); fetchGroups(); }} />

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : proxies.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-20">
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
                      <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
      </PageContent>

      <ProxyFormDialog open={formOpen} proxy={editing} groups={groups} onClose={() => setFormOpen(false)} onSaved={fetchProxies} />
      <ProxyImportDialog open={importOpen} groups={groups} onClose={() => setImportOpen(false)} onImported={fetchProxies} />
      <ConnectionGroupsDialog open={connGroupsOpen} onClose={() => setConnGroupsOpen(false)} />
    </PageLayout>
  );
};

export default Proxies;
