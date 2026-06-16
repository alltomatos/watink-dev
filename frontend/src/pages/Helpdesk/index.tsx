import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-toastify";

import api from "../../services/api";
import ProtocolModal from "./ProtocolModal";
import HelpdeskReports from "./HelpdeskReports";
import { Can } from "../../components/Can";
import useAuth from "../../hooks/useAuth";
import { cn } from "@/lib/utils";

interface Protocol {
  id: number;
  protocolNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  contact?: { name: string };
}

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  pending: "Pendente",
  resolved: "Resolvido",
  closed: "Fechado",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const getStatusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    open: "bg-info hover:bg-info/80 text-info-foreground",
    in_progress: "bg-warning hover:bg-warning/80 text-warning-foreground",
    pending: "bg-slate-500 hover:bg-slate-600 text-white",
    resolved: "bg-success hover:bg-success/80 text-success-foreground",
    closed: "bg-slate-700 hover:bg-slate-800 text-white",
  };
  return map[status] || map.open;
};

const getPriorityBadgeClass = (priority: string) => {
  const map: Record<string, string> = {
    low: "bg-slate-400 hover:bg-slate-500 text-white",
    medium: "bg-info hover:bg-info/80 text-info-foreground",
    high: "bg-warning hover:bg-warning/80 text-warning-foreground",
    urgent: "bg-destructive hover:bg-destructive/80 text-destructive-foreground",
  };
  return map[priority] || map.medium;
};

const Helpdesk: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const loadProtocols = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/protocols", {
        params: {
          searchParam,
          status: statusFilter === "all" ? undefined : statusFilter,
          priority: priorityFilter === "all" ? undefined : priorityFilter,
        },
      });
      setProtocols(data.protocols);
    } catch {
      toast.error("Erro ao carregar protocolos");
    } finally {
      setLoading(false);
    }
  }, [searchParam, statusFilter, priorityFilter]);

  useEffect(() => {
    loadProtocols();
  }, [loadProtocols]);

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => {
    setModalOpen(false);
    loadProtocols();
  };

  const handleViewProtocol = (id: number) => {
    navigate(`/helpdesk/${id}`);
  };

  return (
    <Can
      role={user.profile}
      perform="view_helpdesk"
      yes={() => (
        <div className="mx-auto max-w-7xl p-6">
          <Tabs defaultValue="protocols" className="w-full">
            {/* Header & Tabs */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-bold tracking-tight">🎫 Helpdesk</h1>

              <div className="flex items-center gap-4">
                <TabsList>
                  <TabsTrigger value="protocols">Protocolos</TabsTrigger>
                  <TabsTrigger value="reports">Relatórios</TabsTrigger>
                </TabsList>

                {/* Visible only on protocols tab using CSS trick via TabsContent hierarchy or conditional rendering.
                    Since we want these buttons outside the TabsContent, we wrap the whole thing.
                    But a cleaner way is just placing them below. For layout fidelity with original: */}
              </div>
            </div>

            <TabsContent value="protocols" className="mt-0 outline-none">
              <div className="mb-6 flex flex-col gap-4">
                {/* Actions Row */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/helpdesk/kanban")}
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Ver Kanban
                  </Button>
                  <Can
                    role={user.profile}
                    perform="edit_helpdesk"
                    yes={() => (
                      <Button onClick={handleOpenModal}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Protocolo
                      </Button>
                    )}
                  />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número ou assunto..."
                      className="pl-9"
                      value={searchParam}
                      onChange={(e) => setSearchParam(e.target.value)}
                    />
                  </div>
                  <div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select
                      value={priorityFilter}
                      onValueChange={setPriorityFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as prioridades</SelectItem>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border bg-card">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {protocols.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum protocolo encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        protocols.map((protocol) => (
                          <TableRow key={protocol.id}>
                            <TableCell className="font-semibold">
                              #{protocol.protocolNumber}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={protocol.subject}>
                              {protocol.subject}
                            </TableCell>
                            <TableCell>
                              {protocol.contact?.name || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "font-normal",
                                  getStatusBadgeClass(protocol.status)
                                )}
                              >
                                {statusLabels[protocol.status] || protocol.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "font-normal",
                                  getPriorityBadgeClass(protocol.priority)
                                )}
                              >
                                {priorityLabels[protocol.priority] || protocol.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(
                                new Date(protocol.createdAt),
                                "dd/MM/yyyy HH:mm",
                                { locale: ptBR }
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Can
                                role={user.profile}
                                perform="edit_helpdesk"
                                yes={() => (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewProtocol(protocol.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-0 outline-none">
              <HelpdeskReports />
            </TabsContent>
          </Tabs>

          <ProtocolModal open={modalOpen} onClose={handleCloseModal} />
        </div>
      )}
      no={() => (
        <div className="flex h-full min-h-[50vh] items-center justify-center p-6">
          <h2 className="text-xl font-semibold text-muted-foreground">
            Você não tem permissão para visualizar esta página.
          </h2>
        </div>
      )}
    />
  );
};

export default Helpdesk;
