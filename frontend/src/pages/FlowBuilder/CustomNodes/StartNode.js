import React, { memo } from 'react';
import { Typography } from '@material-ui/core';
import ChatBubbleOutlineIcon from '@material-ui/icons/ChatBubbleOutline';
import FlashOnIcon from '@material-ui/icons/FlashOn';
import ViewWeekIcon from '@material-ui/icons/ViewWeek';
import ScheduleIcon from '@material-ui/icons/Schedule';
import GenericNode from './GenericNode';

export default memo(({ data, isConnectable }) => {
    // Determine styles and icon based on triggerType and actionType
    let borderColor = '#1a192b';
    let Icon = FlashOnIcon;
    let title = 'Início do Fluxo';

    if (data.triggerType === 'time') {
        borderColor = '#ff9800'; // Orange like TriggerNode
        Icon = ScheduleIcon;
        title = 'Gatilho: Tempo';
    } else if (data.triggerType === 'action') {
        if (data.actionType === 'message') {
            borderColor = '#1a192b'; // Default
            Icon = ChatBubbleOutlineIcon;
            title = 'Msg Conexão';
        } else if (data.actionType === 'kanban' || data.actionType === 'funnel') {
            borderColor = '#2196f3'; // Blue like PipelineNode
            Icon = ViewWeekIcon;
            title = data.actionType === 'kanban' ? 'Gatilho: Kanban' : 'Gatilho: Funil';
        }
    }

    // Apenas mostrar delete se onDelet existir
    const handleDelete = data.onDelete ? data.onDelete : undefined;

    return (
        <GenericNode 
            data={data} 
            isConnectable={isConnectable} 
            title={title} 
            icon={Icon}
            style={{ borderColor }}
            onDelete={handleDelete}
        >
            {data.triggerType === 'time' && (
                <Typography variant="caption">Agendado</Typography>
            )}
            {data.triggerType === 'action' && data.actionType === 'message' && (
                <>
                    <Typography variant="caption">{data.connectionName || 'Qualquer Conexão'}</Typography>
                </>
            )}
            {data.triggerType === 'action' && (data.actionType === 'kanban' || data.actionType === 'funnel') && (
                <>
                        <Typography variant="caption">{data.pipelineName || 'Selecione Pipeline'}</Typography>
                </>
            )}
            {!data.triggerType && (
                <Typography variant="caption" color="textSecondary">Configurar...</Typography>
            )}
        </GenericNode>
    );
});
