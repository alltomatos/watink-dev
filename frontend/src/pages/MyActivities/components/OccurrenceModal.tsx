import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewOccurrence } from "../activityTypes";

interface OccurrenceModalProps {
  open: boolean;
  newOccurrence: NewOccurrence;
  onChange: React.Dispatch<React.SetStateAction<NewOccurrence>>;
  onConfirm: () => void;
  onCancel: () => void;
}

const OccurrenceModal: React.FC<OccurrenceModalProps> = ({
  open, newOccurrence, onChange, onConfirm, onCancel,
}) => (
  <Dialog open={open} onOpenChange={onCancel}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Registrar Ocorrência</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tipo</label>
          <Select
            value={newOccurrence.type}
            onValueChange={(v) => onChange((prev) => ({ ...prev, type: v as NewOccurrence["type"] }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Informativo</SelectItem>
              <SelectItem value="impediment">Impedimento (Parou o serviço)</SelectItem>
              <SelectItem value="delay">Atraso (Reduziu ritmo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Descrição do Fato</label>
          <Textarea
            value={newOccurrence.description}
            onChange={(e) => onChange((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Descreva o que ocorreu..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tempo de Impacto (ex: 01:30)</label>
          <Input
            value={newOccurrence.timeImpact}
            onChange={(e) => onChange((prev) => ({ ...prev, timeImpact: e.target.value }))}
            placeholder="01:30"
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Formato HH:MM (ex: 01:30 ou 26:00)
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={onConfirm} disabled={!newOccurrence.description.trim()}>
          Registrar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default OccurrenceModal;
