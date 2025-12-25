import React, { memo } from 'react';
import FlashOnIcon from '@material-ui/icons/FlashOn';
import GenericNode from './GenericNode';

export default memo(({ data, isConnectable }) => {
    return (
        <GenericNode 
            data={data} 
            isConnectable={isConnectable} 
            title="Gatilho (Trigger)" 
            icon={FlashOnIcon}
            style={{ borderColor: '#ff9800' }}
        >
            {data.triggerType ? `Tipo: ${data.triggerType}` : 'Configurar Gatilho'}
            <br/>
            {data.condition && <strong>{data.condition}</strong>}
        </GenericNode>
    );
});
