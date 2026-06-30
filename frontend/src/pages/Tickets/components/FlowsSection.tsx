import React, { useState, useEffect, useCallback } from "react";
import { Play, Zap, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "../../../services/api";

interface Flow {
  id: number;
  name: string;
  active: boolean;
  triggerType?: string;
}

interface FlowRun {
  id: string;
  flowId: number;
  status: string;
  flow?: { id: number; name: string };
}

const STATUS_LABEL: Record<string, string> = {
  running: "Executando",
  waiting_message: "Aguardando resposta",
  waiting_until: "Aguardando tempo",
  waiting_event: "Aguardando evento",
  completed: "Concluído",
  aborted: "Abortado",
  expired: "Expirado",
};

const ACTIVE_STATUSES = ["running", "waiting_message", "waiting_until", "waiting_event"];

interface FlowsSectionProps {
  contactId: number;
}

const FlowsSection: React.FC<FlowsSectionProps> = ({ contactId }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [flowRuns, setFlowRuns] = useState<FlowRun[]>([]);
  const [selectedFlow, setSelectedFlow] = useState("");
  const [starting, setStarting] = useState(false);

  const fetchFlowRuns = useCallback(async () => {
    try {
      const { data } = await api.get<FlowRun[]>("/flowruns", {
        params: { contactId, status: "active" },
      });
      setFlowRuns(Array.isArray(data) ? data : []);
    } catch {
      setFlowRuns([]);
    }
  }, [contactId]);

  useEffect(() => {
    if (contactId) fetchFlowRuns();
  }, [contactId, fetchFlowRuns]);

  const openDialog = async () => {
    try {
      const { data } = await api.get<Flow[]>("/flows");
      setFlows(Array.isArray(data) ? data.filter((f) => f.active) : []);
    } catch {
      setFlows([]);
    }
    setSelectedFlow("");
    setDialogOpen(true);
  };

  const handleStart = async () => {
    if (!selectedFlow) return;
    setStarting(true);
    try {
      await api.post(`/flows/${selectedFlow}/run`, { contactId: String(contactId) });
      toast.success("Fluxo iniciado!");
      setDialogOpen(false);
      fetchFlowRuns();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (msg?.includes("já está neste fluxo")) {
        toast.warning("Contato já está neste fluxo.");
      } else {
        toast.error("Erro ao iniciar fluxo.");
      }
    } finally {
      setStarting(false);
    }
  };

  const handleAbort = async (runId: string) => {
    try {
      await api.delete(`/flowruns/${runId}`);
      toast.success("Fluxo interrompido.");
      fetchFlowRuns();
    } catch {
      toast.error("Erro ao interromper fluxo.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Fluxos
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={openDialog}
            title="Iniciar fluxo"
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
        </div>

        {flowRuns.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum fluxo ativo.</p>
        ) : (
          flowRuns.map((run) => {
            const isActive = ACTIVE_STATUSES.includes(run.status);
            return (
              <div
                key={run.id}
                className="flex items-start justify-between rounded-md border border-border bg-muted/40 px-3 py-2"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-semibold truncate">
                    {run.flow?.name ?? `Fluxo #${run.flowId}`}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {STATUS_LABEL[run.status] ?? run.status}
                  </span>
                </div>
                {isActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 mt-0.5"
                    onClick={() => handleAbort(run.id)}
                    title="Interromper fluxo"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Fluxo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {flows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum fluxo ativo disponível.</p>
            ) : (
              <Select value={selectedFlow} onValueChange={setSelectedFlow}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um fluxo" />
                </SelectTrigger>
                <SelectContent>
                  {flows.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                      {f.triggerType && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({f.triggerType})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleStart}
              disabled={!selectedFlow || flows.length === 0 || starting}
            >
              <Play className="w-4 h-4 mr-1" />
              {starting ? "Iniciando..." : "Iniciar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FlowsSection;
