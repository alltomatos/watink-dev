import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Flow, Whatsapp } from "../flowManagerTypes";

interface FlowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFlow: Flow | null;
  newFlowName: string;
  onFlowNameChange: (name: string) => void;
  selectedWhatsapp: string;
  onWhatsappChange: (value: string) => void;
  whatsapps: Whatsapp[];
  isConnectionUsed: (id: number) => boolean;
  onSave: () => void;
  onClose: () => void;
}

const FlowFormDialog: React.FC<FlowFormDialogProps> = ({
  open,
  onOpenChange,
  selectedFlow,
  newFlowName,
  onFlowNameChange,
  selectedWhatsapp,
  onWhatsappChange,
  whatsapps,
  isConnectionUsed,
  onSave,
  onClose,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {selectedFlow ? "Editar Fluxo" : "Novo Fluxo de Automação"}
          </DialogTitle>
          <DialogDescription>
            Dê um nome claro para identificar sua automação posteriormente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Fluxo</Label>
            <Input
              id="name"
              value={newFlowName}
              onChange={(e) => onFlowNameChange(e.target.value)}
              placeholder="Ex: Boas-vindas Vendas"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="whatsapp">Vincular Conexão</Label>
            <Select value={selectedWhatsapp} onValueChange={onWhatsappChange}>
              <SelectTrigger id="whatsapp">
                <SelectValue placeholder="Nenhuma conexão" />
              </SelectTrigger>
              <SelectContent>
                {whatsapps.map((whatsapp) => {
                  const used = isConnectionUsed(whatsapp.id);
                  return (
                    <SelectItem
                      key={whatsapp.id}
                      value={String(whatsapp.id)}
                      disabled={used && whatsapp.id !== selectedFlow?.whatsappId}
                    >
                      {whatsapp.name} {used ? "(Em uso)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FlowFormDialog;
