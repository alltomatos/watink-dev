import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { makeStyles } from '@material-ui/core/styles';
import { Typography, IconButton, Button, TextField } from '@material-ui/core';
import ListIcon from '@material-ui/icons/List';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import GenericNode from './GenericNode';

const useStyles = makeStyles((theme) => ({
    optionsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%'
    },
    optionItem: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 4
    },
    handle: {
        right: -10,
        background: '#555'
    },
    addButton: {
        marginTop: 8,
        width: '100%',
        fontSize: 10
    }
}));

export default memo(({ data, isConnectable }) => {
    const classes = useStyles();
    const [options, setOptions] = useState(data.options || [{ id: 'opt1', label: 'Opção 1' }]);

    const handleAddOption = () => {
        const newOption = {
            id: `opt${options.length + 1}_${Date.now()}`,
            label: `Opção ${options.length + 1}`
        };
        const newOptions = [...options, newOption];
        setOptions(newOptions);
        data.onUpdateOptions && data.onUpdateOptions(newOptions);
    };

    const handleRemoveOption = (optId) => {
        const newOptions = options.filter(o => o.id !== optId);
        setOptions(newOptions);
        data.onUpdateOptions && data.onUpdateOptions(newOptions);
    };

    const handleLabelChange = (optId, newLabel) => {
        const newOptions = options.map(o => o.id === optId ? { ...o, label: newLabel } : o);
        setOptions(newOptions);
        data.onUpdateOptions && data.onUpdateOptions(newOptions);
    };

    return (
        <GenericNode 
            data={data} 
            isConnectable={isConnectable} 
            title="Menu de Opções" 
            icon={ListIcon}
            style={{ borderColor: '#009688' }}
        >
            <div className={classes.optionsContainer}>
                {options.map((option, index) => (
                    <div key={option.id} className={classes.optionItem}>
                        <TextField
                            value={option.label}
                            onChange={(e) => handleLabelChange(option.id, e.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            placeholder="Nome da opção"
                            InputProps={{
                                style: { fontSize: 12, padding: 0 }
                            }}
                        />
                        <IconButton size="small" onClick={() => handleRemoveOption(option.id)}>
                            <DeleteIcon style={{ fontSize: 14 }} />
                        </IconButton>
                        
                        {/* Saída dinâmica para cada opção */}
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={option.id}
                            isConnectable={isConnectable}
                            className={classes.handle}
                            style={{ top: '50%' }}
                        />
                    </div>
                ))}
            </div>

            <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                className={classes.addButton}
                onClick={handleAddOption}
            >
                Adicionar Opção
            </Button>
        </GenericNode>
    );
});
