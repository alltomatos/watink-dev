import React from 'react';
import { Ticket } from 'lucide-react';
import BaseNode from './BaseNode';

interface TicketNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const getActionLabel = (action?: string): string => {
  switch (action) {
    case 'moveToQueue': return 'Mover p/ Fila';
    case 'assignUser': return 'Atribuir Atendente';
    case 'changeStatus': return 'Alterar Status';
    case 'addTag': return 'Adicionar Tag';
    default: return 'Configurar Ticket';
  }
};

const TicketNode: React.FC<TicketNodeProps> = ({ data, isConnectable }) => (
  <BaseNode
    data={data}
    icon={Ticket}
    colorClass="colorTicket"
    defaultLabel="Ticket"
    sublabel={getActionLabel(data?.ticketAction as string)}
    isConnectable={isConnectable}
  />
);

export default TicketNode;
