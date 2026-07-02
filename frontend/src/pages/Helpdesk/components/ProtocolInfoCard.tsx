import React from "react";
import PaperCard from "../../../components/PaperCard";
import type { Protocol } from "../protocolTypes";
import { getContactDisplayName } from "@/utils/clientDisplayName";

interface ProtocolInfoCardProps {
  protocol: Protocol;
}

const ProtocolInfoCard: React.FC<ProtocolInfoCardProps> = ({ protocol }) => (
  <PaperCard>
    <h2 className="mb-4 text-base font-semibold">Detalhes</h2>
    <dl className="flex flex-col gap-3">
      <div>
        <dt className="text-xs font-medium text-muted-foreground">Assunto</dt>
        <dd className="mt-0.5 text-sm">{protocol.subject}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-muted-foreground">Descrição</dt>
        <dd className="mt-0.5 whitespace-pre-wrap text-sm">{protocol.description}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-muted-foreground">Categoria</dt>
        <dd className="mt-0.5 text-sm">{protocol.category || "-"}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-muted-foreground">Contato</dt>
        <dd className="mt-0.5 text-sm">
          {protocol.contact ? getContactDisplayName(protocol.contact) : "-"}
        </dd>
      </div>
    </dl>
  </PaperCard>
);

export default ProtocolInfoCard;
