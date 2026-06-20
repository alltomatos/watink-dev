import React from "react";
import { ArrowLeft, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProtocolDetailsHeaderProps {
  protocolNumber: string;
  onBack: () => void;
  onCopyLink: () => void;
}

const ProtocolDetailsHeader: React.FC<ProtocolDetailsHeaderProps> = ({
  protocolNumber,
  onBack,
  onCopyLink,
}) => (
  <div className="mb-6 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Voltar
      </Button>
      <h1 className="text-2xl font-bold">Protocolo #{protocolNumber}</h1>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCopyLink}
            aria-label="Copiar link externo"
          >
            <Link className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copiar link externo (para enviar ao cliente)</TooltipContent>
      </Tooltip>
    </div>
  </div>
);

export default ProtocolDetailsHeader;
