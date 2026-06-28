import React from 'react';
import { Bot } from 'lucide-react';
import BaseNode from './BaseNode';

interface AgentNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const AgentNode: React.FC<AgentNodeProps> = ({ data, isConnectable }) => {
  const persona = (data?.persona as string) || '';
  const sublabel = persona ? 'Persona definida' : 'IA conversacional';

  return (
    <BaseNode
      data={data}
      icon={Bot}
      colorClass="colorAgent"
      defaultLabel="Agente IA"
      sublabel={sublabel}
      isConnectable={isConnectable}
    />
  );
};

export default AgentNode;
