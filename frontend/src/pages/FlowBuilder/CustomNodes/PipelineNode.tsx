import React from 'react';
import { GitCommit } from 'lucide-react';
import BaseNode from './BaseNode';

interface PipelineNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const getActionLabel = (action?: string): string => {
  switch (action) {
    case 'createDeal': return 'Criar Oportunidade';
    case 'moveDeal': return 'Mover Etapa';
    case 'updateDeal': return 'Atualizar Oportunidade';
    default: return 'Integração Kanban';
  }
};

const PipelineNode: React.FC<PipelineNodeProps> = ({ data, isConnectable }) => (
  <BaseNode
    data={data}
    icon={GitCommit}
    colorClass="colorPipeline"
    defaultLabel="Pipeline"
    sublabel={getActionLabel(data?.kanbanAction as string)}
    isConnectable={isConnectable}
  />
);

export default PipelineNode;
