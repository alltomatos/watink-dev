import React from "react";
import { Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";

interface HelpdeskSectionProps {
  onOpenProtocol: () => void;
}

const HelpdeskSection = ({ onOpenProtocol }: HelpdeskSectionProps) => {
  return (
    <div className="border border-[var(--border-divider)] rounded p-3 bg-[var(--bg-surface)]">
      <p className="text-sm font-medium mb-2">🎫 Helpdesk - Protocolos</p>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onOpenProtocol}
      >
        <Ticket className="w-4 h-4 mr-2" />
        Abrir Protocolo
      </Button>
    </div>
  );
};

export default HelpdeskSection;
