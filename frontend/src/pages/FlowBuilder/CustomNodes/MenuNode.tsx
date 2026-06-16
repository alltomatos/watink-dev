import React from 'react';
import { List } from 'lucide-react';
import BaseNode from './BaseNode';

interface MenuNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const MenuNode: React.FC<MenuNodeProps> = ({ data, isConnectable }) => {
  const optionCount = (data?.options as unknown[])?.length ?? 0;

  return (
    <BaseNode
      data={data}
      icon={List}
      colorClass="colorMenu"
      defaultLabel="Menu"
      sublabel={optionCount > 0 ? `${optionCount} opções` : ''}
      isConnectable={isConnectable}
      badge={optionCount > 0 ? optionCount : null}
    />
  );
};

export default MenuNode;
