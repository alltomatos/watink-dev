import React, { memo } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Typography, IconButton } from '@material-ui/core';
import ChatBubbleOutlineIcon from '@material-ui/icons/ChatBubbleOutline';
import EditIcon from '@material-ui/icons/Edit';
import GenericNode from './GenericNode';

const useStyles = makeStyles((theme) => ({
    editButton: {
        padding: 4,
        marginTop: 4
    }
}));

export default memo(({ data, isConnectable }) => {
    const classes = useStyles();

    const handleEdit = () => {
        if (data.onEdit) {
            data.onEdit();
        }
    };

    return (
        <GenericNode 
            data={data} 
            isConnectable={isConnectable} 
            title="Mensagem" 
            icon={ChatBubbleOutlineIcon}
        >
            {data.content ? (
                <Typography variant="caption" noWrap>
                    {data.contentType === 'text' ? data.content : `[${data.contentType}]`}
                </Typography>
            ) : (
                <Typography variant="caption" color="textSecondary">
                    Configurar conteúdo...
                </Typography>
            )}
            <IconButton size="small" className={classes.editButton} onClick={handleEdit}>
                <EditIcon style={{ fontSize: 16 }} />
            </IconButton>
        </GenericNode>
    );
});
