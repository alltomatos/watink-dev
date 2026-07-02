import React from 'react';
import { Reply } from 'lucide-react';
import { i18n } from '../../../translate/i18n';
import BaseNode from './BaseNode';

interface QuickAnswerNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const QuickAnswerNode: React.FC<QuickAnswerNodeProps> = ({ data, isConnectable }) => (
  <BaseNode
    data={data}
    icon={Reply}
    colorClass="colorQuickAnswer"
    defaultLabel={i18n.t('flowBuilder.nodes.quickAnswer.paletteLabel') as string}
    sublabel={(data?.quickAnswerId as string) ? undefined : i18n.t('flowBuilder.nodes.quickAnswer.empty') as string}
    isConnectable={isConnectable}
  />
);

export default QuickAnswerNode;
