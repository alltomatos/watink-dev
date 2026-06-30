import React from "react";
import { Play } from "lucide-react";

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

import { Flow } from "../contactDrawerTypes";

interface NewFlowRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flows: Flow[];
  selectedFlow: string;
  onFlowChange: (flowId: string) => void;
  onStart: () => void;
  onCancel: () => void;
}

const NewFlowRunDialog = ({
  open,
  onOpenChange,
  flows,
  selectedFlow,
  onFlowChange,
  onStart,
  onCancel,
}: NewFlowRunDialogProps) => {
  const activeFlows = flows.filter((f) => f.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Fluxo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {activeFlows.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Nenhum fluxo ativo disponível.
            </p>
          ) : (
            <Select value={selectedFlow} onValueChange={onFlowChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um fluxo" />
              </SelectTrigger>
              <SelectContent>
                {activeFlows.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    <span>{f.name}</span>
                    {f.triggerType && (
                      <span className="ml-2 text-xs text-[var(--text-secondary)]">
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
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={onStart}
            disabled={!selectedFlow || activeFlows.length === 0}
          >
            <Play className="w-4 h-4 mr-1" />
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewFlowRunDialog;
