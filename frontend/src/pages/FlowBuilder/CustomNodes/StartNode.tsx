import React from 'react';
import { Position } from 'reactflow';
import { Play } from 'lucide-react';
import BaseNode from './BaseNode';

interface StartNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const StartNode: React.FC<StartNodeProps> = ({ data, isConnectable }) => (
  <BaseNode
    data={data}
    icon={Play}
    colorClass="colorTrigger"
    defaultLabel="Início"
    sublabel={(data?.triggerType as string) || ''}
    isConnectable={isConnectable}
    targetHandles={[]}
    sourceHandles={[{ id: null, position: Position.Right }]}
  />
);

export default StartNode;
