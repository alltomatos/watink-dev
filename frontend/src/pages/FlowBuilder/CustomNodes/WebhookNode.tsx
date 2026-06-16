import React, { memo } from 'react';
import { Webhook } from 'lucide-react';
import BaseNode from './BaseNode';

interface WebhookNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const WebhookNode: React.FC<WebhookNodeProps> = ({ data, isConnectable }) => (
  <BaseNode
    data={data}
    icon={Webhook}
    colorClass="colorWebhook"
    defaultLabel="Webhook"
    sublabel={`${(data?.method as string) || ''} ${(data?.url as string) || ''}`}
    isConnectable={isConnectable}
  />
);

export default memo(WebhookNode);
