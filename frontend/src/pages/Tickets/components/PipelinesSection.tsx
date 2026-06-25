import React, { useState } from "react";
import { GitBranch, Plus, Trash2 } from "lucide-react";
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
import { useDeals } from "../../../hooks/useDeals";

interface Pipeline {
  id: number;
  name: string;
  stages: { id: number; name: string }[];
}

interface PipelinesSectionProps {
  ticketId: number;
  contactId: number;
  contactName: string;
}

const PipelinesSection: React.FC<PipelinesSectionProps> = ({ ticketId, contactId, contactName }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [saving, setSaving] = useState(false);

  const { deals, refetch } = useDeals({ ticketId });

  const openDialog = async () => {
    try {
      const { data } = await api.get<Pipeline[]>("/pipelines");
      setPipelines(Array.isArray(data) ? data : []);
    } catch {
      setPipelines([]);
    }
    setSelectedPipeline("");
    setSelectedStage("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedStage) return;
    setSaving(true);
    try {
      await api.post("/deals", {
        name: contactName,
        stageId: Number(selectedStage),
        contactId,
        ticketId,
      });
      toast.success("Adicionado ao pipeline!");
      setDialogOpen(false);
      refetch();
    } catch {
      toast.error("Erro ao salvar deal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dealId: number) => {
    try {
      await api.put(`/deals/${dealId}`, { status: "deleted" });
      refetch();
    } catch {
      toast.error("Erro ao remover deal.");
    }
  };

  const currentStages = pipelines.find((p) => String(p.id) === selectedPipeline)?.stages ?? [];

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            Pipelines
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={openDialog}
            title="Adicionar ao pipeline"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {deals.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum pipeline vinculado.</p>
        ) : (
          deals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-start justify-between rounded-md border border-border bg-muted/40 px-3 py-2"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-semibold truncate">
                  {deal.stage?.pipeline?.name ?? "Pipeline"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {deal.stage?.name ?? "Etapa"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 mt-0.5"
                onClick={() => handleDelete(deal.id)}
                title="Remover do pipeline"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar ao Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Pipeline</label>
              <Select
                value={selectedPipeline}
                onValueChange={(v) => { setSelectedPipeline(v); setSelectedStage(""); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPipeline && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Etapa</label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentStages.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!selectedPipeline || !selectedStage || saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PipelinesSection;
