import React from 'react';
import { MessageSquare } from 'lucide-react';
import BaseNode from './BaseNode';

interface MessageNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const MessageNode: React.FC<MessageNodeProps> = ({ data, isConnectable }) => {
  const content = (data?.content as string) || '';
  const preview = content.length > 15 ? content.substring(0, 15) + '...' : content;

  return (
    <BaseNode
      data={data}
      icon={MessageSquare}
      colorClass="colorMessage"
      defaultLabel="Mensagem"
      sublabel={preview}
      isConnectable={isConnectable}
    />
  );
};

export default MessageNode;
