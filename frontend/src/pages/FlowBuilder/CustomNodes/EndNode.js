import React, { memo } from 'react';
import { Typography } from '@material-ui/core';
import FlagIcon from '@material-ui/icons/Flag';
import GenericNode from './GenericNode';

export default memo(({ data, isConnectable }) => {
    // Apenas mostrar delete se onDelete existir
    const handleDelete = data.onDelete ? data.onDelete : undefined;

    return (
        <GenericNode 
            data={data} 
            isConnectable={isConnectable} 
            title="Fim" 
            icon={FlagIcon}
            onDelete={handleDelete}
            showSourceHandle={false}
        >
            <Typography variant="caption" color="textSecondary">
                Finalizar Fluxo
            </Typography>
        </GenericNode>
    );
});
