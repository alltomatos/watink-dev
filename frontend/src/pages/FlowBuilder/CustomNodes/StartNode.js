/* @jsxImportSource react */
import React from 'react';
import { Position } from 'reactflow';
import { PlayArrow as PlayIcon } from '@material-ui/icons';
import BaseNode from './BaseNode';

const StartNode = ({ data, isConnectable, selected }) => {
    return (
        <BaseNode
            data={data}
            icon={PlayIcon}
            colorClass="colorTrigger"
            defaultLabel="Início"
            sublabel={data?.triggerType || ''}
            isConnectable={isConnectable}
            selected={selected}
            targetHandles={[]} // Sem entrada
            sourceHandles={[{ id: null, position: Position.Right }]}
        />
    );
};

export default StartNode;
