import React from 'react';
import { Lightbulb } from 'lucide-react';
import BaseNode from './BaseNode';

interface KnowledgeNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const KnowledgeNode: React.FC<KnowledgeNodeProps> = ({ data, isConnectable }) => {
  const mode = (data?.responseMode as string) || 'auto';

  return (
    <BaseNode
      data={data}
      icon={Lightbulb}
      colorClass="colorKnowledge"
      defaultLabel="IA"
      sublabel={mode === 'auto' ? 'Automático' : mode}
      isConnectable={isConnectable}
    />
  );
};

export default KnowledgeNode;
