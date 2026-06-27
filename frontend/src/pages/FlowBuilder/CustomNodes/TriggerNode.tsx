import React from 'react';
import { Position } from '@xyflow/react';
import { Bell } from 'lucide-react';
import BaseNode from './BaseNode';

interface TriggerNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  time: 'Agendado',
  message: 'Mensagem',
  webhook: 'Webhook',
  event: 'Evento',
};

const TriggerNode: React.FC<TriggerNodeProps> = ({ data, isConnectable }) => {
  const triggerType = (data?.triggerType as string) || 'message';
  const triggerLabel = TRIGGER_LABELS[triggerType] ?? triggerType;

  return (
    <BaseNode
      data={data}
      icon={Bell}
      colorClass="colorTrigger"
      defaultLabel="Gatilho"
      sublabel={triggerLabel}
      isConnectable={isConnectable}
      targetHandles={[]}
      sourceHandles={[{ id: null, position: Position.Right }]}
    />
  );
};

export default TriggerNode;
