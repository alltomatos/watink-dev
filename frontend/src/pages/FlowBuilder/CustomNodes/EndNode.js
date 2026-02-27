/* @jsxImportSource react */
import React from 'react';
import { Position } from 'reactflow';
import { Stop as StopIcon } from '@material-ui/icons';
import BaseNode from './BaseNode';

const EndNode = ({ data, isConnectable, selected }) => {
    return (
        <BaseNode
            data={data}
            icon={StopIcon}
            colorClass="colorEnd"
            defaultLabel="Fim"
            sublabel={data?.endAction || ''}
            isConnectable={isConnectable}
            selected={selected}
            targetHandles={[{ id: null, position: Position.Left }]}
            sourceHandles={[]} // Sem saída
        />
    );
};

export default EndNode;
