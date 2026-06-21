import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import { WIDGET_LABELS, type WidgetConfig } from "../dashboardTypes";

interface DashboardCustomizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sortedWidgets: WidgetConfig[];
  onToggle: (id: string) => void;
  onMove: (index: number, direction: number) => void;
  onSave: () => Promise<void>;
}

const DashboardCustomizeModal: React.FC<DashboardCustomizeModalProps> = ({
  open,
  onOpenChange,
  sortedWidgets,
  onToggle,
  onMove,
  onSave,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Configurações do Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {sortedWidgets.map((widget, index) => (
            <div
              key={widget.id}
              className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4"
            >
              <label className="flex items-center gap-3 text-sm font-semibold">
                <Checkbox
                  checked={widget.visible}
                  onCheckedChange={() => onToggle(widget.id)}
                />
                {WIDGET_LABELS[widget.id] || widget.id}
              </label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMove(index, 1)}
                  disabled={index === sortedWidgets.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={onSave}>
            Salvar Preferências
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardCustomizeModal;
