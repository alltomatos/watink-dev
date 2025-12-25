import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { makeStyles } from '@material-ui/core/styles';
import { Typography, IconButton, Paper } from '@material-ui/core';
import CallSplitIcon from '@material-ui/icons/CallSplit';
import DeleteIcon from '@material-ui/icons/Delete';

const useStyles = makeStyles((theme) => ({
    node: {
        padding: '10px',
        border: '1px solid #777',
        borderRadius: '5px',
        background: 'white',
        color: '#333',
        fontSize: '14px',
        minWidth: 180,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
        marginBottom: 8,
        color: '#f50057'
    },
    title: {
        fontWeight: 'normal',
        display: 'flex',
        alignItems: 'center',
        gap: 6
    },
    deleteButton: {
        position: 'absolute',
        right: -5,
        top: -5,
        padding: 2
    },
    content: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontSize: '12px',
        color: '#555'
    },
    handleLabel: {
        position: 'absolute',
        fontSize: 10,
        bottom: -15,
        width: 50,
        textAlign: 'center'
    }
}));

export default memo(({ data, isConnectable }) => {
    const classes = useStyles();

    return (
        <Paper className={classes.node}>
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                style={{ background: '#555', width: 8, height: 8 }}
            />
            
            <div className={classes.header}>
                <div className={classes.title}>
                    <CallSplitIcon style={{ fontSize: 16 }} />
                    <Typography variant="subtitle2">Decisão (Switch)</Typography>
                </div>
                <IconButton 
                    size="small" 
                    className={classes.deleteButton} 
                    onClick={() => data.onDelete && data.onDelete()}
                >
                    <DeleteIcon style={{ fontSize: 14, color: '#999' }} />
                </IconButton>
            </div>
            
            <div className={classes.content}>
                {data.label || 'Avaliar Resposta'}
            </div>

            {/* Saída A */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="a"
                style={{ left: '30%', background: '#4caf50' }}
                isConnectable={isConnectable}
            />
            <div className={classes.handleLabel} style={{ left: '20%', bottom: -20, color: '#4caf50' }}>
                Opção A
            </div>

            {/* Saída B */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="b"
                style={{ left: '70%', background: '#f44336' }}
                isConnectable={isConnectable}
            />
             <div className={classes.handleLabel} style={{ left: '60%', bottom: -20, color: '#f44336' }}>
                Opção B
            </div>
        </Paper>
    );
});
