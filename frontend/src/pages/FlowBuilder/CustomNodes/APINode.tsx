import React, { memo } from 'react';
import { Globe } from 'lucide-react';
import BaseNode from './BaseNode';

interface APINodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const APINode: React.FC<APINodeProps> = ({ data, isConnectable }) => (
  <BaseNode
    data={data}
    icon={Globe}
    colorClass="colorApi"
    defaultLabel="API Request"
    sublabel="Integração Externa"
    isConnectable={isConnectable}
  />
);

export default memo(APINode);
