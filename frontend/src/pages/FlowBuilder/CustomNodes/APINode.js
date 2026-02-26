/* @jsxImportSource react */
import React, { memo } from 'react';
import { Language } from '@material-ui/icons';
import BaseNode from './BaseNode';

const APINode = ({ data, isConnectable, selected }) => {
    return (
        <BaseNode
            data={data}
            icon={Language}
            colorClass="colorApi"
            defaultLabel="API Request"
            sublabel="Integração Externa"
            isConnectable={isConnectable}
            selected={selected}
        />
    );
};

export default memo(APINode);
