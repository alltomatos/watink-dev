import React, { memo } from 'react';
import { Typography } from '@material-ui/core';
import ViewWeekIcon from '@material-ui/icons/ViewWeek';
import GenericNode from './GenericNode';

export default memo(({ data, isConnectable }) => {
    return (
        <GenericNode 
            data={data} 
            isConnectable={isConnectable} 
            title="Pipeline" 
            icon={ViewWeekIcon}
            style={{ borderColor: '#2196f3', background: '#e3f2fd' }}
        >
            {data.pipelineName ? `Pipeline: ${data.pipelineName}` : 'Selecione Pipeline'}
            <br/>
            {data.stageName && <small>Etapa: {data.stageName}</small>}
        </GenericNode>
    );
});
