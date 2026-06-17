import React from 'react';
import { Filter } from 'lucide-react';
import BaseNode from './BaseNode';

interface FilterNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

const FilterNode: React.FC<FilterNodeProps> = ({ data, isConnectable }) => {
  const filterCount = (data?.filterConditions as unknown[])?.length ?? 0;
  const inputVar = (data?.inputVariable as string) || '';

  return (
    <BaseNode
      data={data}
      icon={Filter}
      colorClass="colorFilter"
      defaultLabel="Filtrar"
      sublabel={inputVar || (filterCount > 0 ? `${filterCount} filtros` : '')}
      isConnectable={isConnectable}
      badge={filterCount > 0 ? filterCount : null}
    />
  );
};

export default FilterNode;
