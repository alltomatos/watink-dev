import React from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransferControlsProps {
  onMoveRight: () => void;
  onMoveLeft: () => void;
  disableMoveRight: boolean;
  disableMoveLeft: boolean;
}

export function TransferControls({
  onMoveRight,
  onMoveLeft,
  disableMoveRight,
  disableMoveLeft,
}: TransferControlsProps) {
  return (
    <div className="flex flex-row md:flex-col items-center gap-2 shrink-0">
      <Button
        variant="default"
        size="sm"
        onClick={onMoveRight}
        disabled={disableMoveRight}
        aria-label="Mover selecionados para a direita"
        className="w-9 h-9 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={onMoveLeft}
        disabled={disableMoveLeft}
        aria-label="Mover selecionados para a esquerda"
        className="w-9 h-9 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}
