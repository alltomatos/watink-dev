import React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Pipeline, Stage } from "../contactDrawerTypes";

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelines: Pipeline[];
  stages: Stage[];
  selectedPipeline: string;
  selectedStage: string;
  onPipelineChange: (pipelineId: string) => void;
  onStageChange: (stageId: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const NewDealDialog = ({
  open,
  onOpenChange,
  pipelines,
  stages,
  selectedPipeline,
  selectedStage,
  onPipelineChange,
  onStageChange,
  onSave,
  onCancel,
}: NewDealDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Pipeline</label>
            <Select value={selectedPipeline} onValueChange={onPipelineChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedPipeline && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Etapa</label>
              <Select value={selectedStage} onValueChange={onStageChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={!selectedPipeline || !selectedStage}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewDealDialog;
