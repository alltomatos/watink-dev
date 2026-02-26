/* @jsxImportSource react */
import React from 'react';
import { Position } from 'reactflow';
import { FilterList as FilterIcon } from '@material-ui/icons';
import BaseNode from './BaseNode';

const FilterNode = ({ data, isConnectable, selected }) => {
    const filterCount = data?.filterConditions?.length || 0;
    const inputVar = data?.inputVariable || '';

    return (
        <BaseNode
            data={data}
            icon={FilterIcon}
            colorClass="colorFilter"
            defaultLabel="Filtrar"
            sublabel={inputVar || (filterCount > 0 ? `${filterCount} filtros` : '')}
            isConnectable={isConnectable}
            selected={selected}
            badge={filterCount > 0 ? filterCount : null}
        />
    );
};

export default FilterNode;
