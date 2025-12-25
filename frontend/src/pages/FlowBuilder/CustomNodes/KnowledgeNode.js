import React, { memo } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import GenericNode from './GenericNode';

const useStyles = makeStyles((theme) => ({
    fileBadge: {
        background: '#fff',
        padding: '2px 6px',
        borderRadius: 4,
        border: '1px solid #ddd',
        fontSize: 10,
        display: 'flex',
        alignItems: 'center',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    }
}));

export default memo(({ data, isConnectable }) => {
    const classes = useStyles();

    return (
        <GenericNode 
            data={data} 
            isConnectable={isConnectable} 
            title="Conhecimento" 
            icon={LibraryBooksIcon}
            style={{ borderColor: '#9c27b0', background: '#f3e5f5' }}
        >
            <span>{data.label || 'Base de Conhecimento'}</span>
            {data.fileName ? (
                <div className={classes.fileBadge}>
                    <AttachFileIcon style={{ fontSize: 12, marginRight: 2 }} />
                    {data.fileName}
                </div>
            ) : (
                <small style={{ fontStyle: 'italic' }}>Nenhum arquivo</small>
            )}
        </GenericNode>
    );
});
