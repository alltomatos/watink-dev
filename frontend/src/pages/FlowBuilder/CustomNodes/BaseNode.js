/* @jsxImportSource react */
import React from 'react';
import { Handle, Position } from 'reactflow';
import { makeStyles } from '@material-ui/core/styles';
import { Typography, Tooltip } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
    nodeWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: 80,
        maxWidth: 100,
        cursor: 'pointer',
        '&:hover $nodeCard': {
            transform: 'scale(1.05)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
        }
    },
    nodeCard: {
        width: 60,
        height: 60,
        borderRadius: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
        border: '1px solid rgba(255,255,255,0.1)'
    },
    icon: {
        fontSize: 28,
        color: '#fff'
    },
    label: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: 600,
        color: '#1a1a1a',
        textAlign: 'center',
        maxWidth: 100,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.2
    },
    sublabel: {
        fontSize: 10,
        color: '#8E8E93',
        textAlign: 'center',
        marginTop: 2
    },
    handle: {
        width: 10,
        height: 10,
        background: '#ffffff',
        border: '2px solid #007AFF',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        '&:hover': {
            transform: 'scale(1.2)',
            background: '#007AFF'
        }
    },
    handleLeft: {
        left: -5
    },
    handleRight: {
        right: -5
    },
    handleTop: {
        top: -5
    },
    handleBottom: {
        bottom: -5
    },
    // Modern gradients
    colorTrigger: { background: 'linear-gradient(180deg, #34C759 0%, #28A745 100%)' },
    colorMessage: { background: 'linear-gradient(180deg, #007AFF 0%, #0056B3 100%)' },
    colorMenu: { background: 'linear-gradient(180deg, #FF9500 0%, #E68600 100%)' },
    colorSwitch: { background: 'linear-gradient(180deg, #AF52DE 0%, #8E44AD 100%)' },
    colorDatabase: { background: 'linear-gradient(180deg, #A2845E 0%, #846C4D 100%)' },
    colorFilter: { background: 'linear-gradient(180deg, #5856D6 0%, #4745B1 100%)' },
    colorPipeline: { background: 'linear-gradient(180deg, #5AC8FA 0%, #48A1C9 100%)' },
    colorWebhook: { background: 'linear-gradient(180deg, #FF3B30 0%, #D63027 100%)' },
    colorApi: { background: 'linear-gradient(180deg, #5856D6 0%, #4745B1 100%)' },
    colorKnowledge: { background: 'linear-gradient(180deg, #FF2D55 0%, #D62548 100%)' },
    colorEnd: { background: 'linear-gradient(180deg, #FF3B30 0%, #D63027 100%)' },
    colorDefault: { background: 'linear-gradient(180deg, #8E8E93 0%, #636366 100%)' },
    colorTicket: { background: 'linear-gradient(180deg, #FF2D55 0%, #D62548 100%)' },
    colorHelpdesk: { background: 'linear-gradient(180deg, #00C7BE 0%, #00A39C 100%)' },
    // Badge para indicadores
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 'bold',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    }
}));

/**
 * BaseNode - Componente base para todos os nós no estilo N8N
 * @param {object} data - dados do nó
 * @param {React.Component} icon - componente de ícone
 * @param {string} colorClass - classe de cor (colorTrigger, colorMessage, etc)
 * @param {string} defaultLabel - label padrão se não definido
 * @param {string} sublabel - texto adicional abaixo do título
 * @param {boolean} isConnectable - se pode conectar
 * @param {array} sourceHandles - handles de saída customizados [{id, position, style}]
 * @param {array} targetHandles - handles de entrada customizados [{id, position, style}]
 * @param {string|number} badge - badge no canto do nó
 */
const BaseNode = ({
    data,
    icon: Icon,
    colorClass = 'colorDefault',
    defaultLabel = 'Nó',
    sublabel = '',
    isConnectable = true,
    sourceHandles = [{ id: null, position: Position.Right }],
    targetHandles = [{ id: null, position: Position.Left }],
    badge = null
}) => {
    const classes = useStyles();
    const label = data?.label || defaultLabel;
    const displaySublabel = sublabel || data?.sublabel || '';

    return (
        <Tooltip title={label} placement="top" arrow>
            <div className={classes.nodeWrapper}>
                {/* Handles de entrada */}
                {targetHandles.map((handle, idx) => (
                    <Handle
                        key={`target-${idx}`}
                        type="target"
                        position={handle.position}
                        id={handle.id}
                        isConnectable={isConnectable}
                        className={`${classes.handle} ${handle.position === Position.Left ? classes.handleLeft :
                            handle.position === Position.Top ? classes.handleTop : ''
                            }`}
                        style={handle.style}
                    />
                ))}

                {/* Card do nó */}
                <div className={`${classes.nodeCard} ${classes[colorClass]}`}>
                    {Icon && <Icon className={classes.icon} />}
                    {badge && <div className={classes.badge}>{badge}</div>}
                </div>

                {/* Label abaixo */}
                <Typography className={classes.label}>
                    {label}
                </Typography>

                {displaySublabel && (
                    <Typography className={classes.sublabel}>
                        {displaySublabel}
                    </Typography>
                )}

                {/* Handles de saída */}
                {sourceHandles.map((handle, idx) => (
                    <Handle
                        key={`source-${idx}`}
                        type="source"
                        position={handle.position}
                        id={handle.id}
                        isConnectable={isConnectable}
                        className={`${classes.handle} ${handle.position === Position.Right ? classes.handleRight :
                            handle.position === Position.Bottom ? classes.handleBottom : ''
                            }`}
                        style={handle.style}
                    />
                ))}
            </div>
        </Tooltip>
    );
};

export default BaseNode;
