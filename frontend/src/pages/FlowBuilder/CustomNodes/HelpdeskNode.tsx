import React from 'react';
import { Position } from 'reactflow';
import { LifeBuoy } from 'lucide-react';
import BaseNode from './BaseNode';

interface HelpdeskNodeProps {
  id?: string;
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  createProtocol: 'Criar Protocolo',
  checkStatus: 'Verificar Status',
};

const HelpdeskNode: React.FC<HelpdeskNodeProps> = ({ data, isConnectable }) => {
  const action = (data?.helpdeskAction as string) || 'createProtocol';

  return (
    <BaseNode
      data={data}
      icon={LifeBuoy}
      colorClass="colorHelpdesk"
      defaultLabel="Helpdesk"
      sublabel={ACTION_LABELS[action] ?? action}
      isConnectable={isConnectable}
      targetHandles={[{ id: null, position: Position.Left }]}
      sourceHandles={[{ id: null, position: Position.Right }]}
    />
  );
};

export default HelpdeskNode;
