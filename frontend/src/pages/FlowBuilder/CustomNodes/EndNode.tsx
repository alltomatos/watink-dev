import React from 'react';
import { Position } from '@xyflow/react';
import { Square } from 'lucide-react';
import BaseNode from './BaseNode';

interface EndNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const EndNode: React.FC<EndNodeProps> = ({ data, isConnectable }) => (
  <BaseNode
    data={data}
    icon={Square}
    colorClass="colorEnd"
    defaultLabel="Fim"
    sublabel={(data?.endAction as string) || ''}
    isConnectable={isConnectable}
    targetHandles={[{ id: null, position: Position.Left }]}
    sourceHandles={[]}
  />
);

export default EndNode;
