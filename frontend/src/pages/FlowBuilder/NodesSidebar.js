import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Typography, Tooltip } from '@material-ui/core';
import {
    Notifications as TriggerIcon,
    Message as MessageIcon,
    List as MenuIcon,
    PlayArrow as PlayIcon,
    CallSplit as SwitchIcon,
    Stop as StopIcon,
    Timeline as PipelineIcon,
    EmojiObjects as KnowledgeIcon,
    Storage as DatabaseIcon,
    FilterList as FilterIcon,
    ConfirmationNumber as TicketIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
    sidebar: {
        width: '280px', // Aumentado um pouco para caber 3 colunas se necessário ou 2 mais folgadas
        padding: '15px',
        borderRight: '1px solid #eee',
        background: '#fcfcfc',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        overflowY: 'auto'
    },
    categoryTitle: {
        marginTop: '15px',
        marginBottom: '10px',
        fontWeight: 'bold',
        color: '#666',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)', // 3 Colunas
        gap: '12px'
    },
    // Estilos do Card (Copiados/Adaptados de BaseNode)
    nodeWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'grab',
        transition: 'transform 0.2s',
        '&:hover': {
            transform: 'scale(1.05)'
        },
        '&:active': {
            cursor: 'grabbing'
        }
    },
    nodeCard: {
        width: 45, // Um pouco menor que no canvas (50) para ficar harmonioso no sidebar
        height: 45,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: 6
    },
    icon: {
        fontSize: 22,
        color: '#fff'
    },
    label: {
        fontSize: 10,
        fontWeight: 500,
        color: '#333',
        textAlign: 'center',
        lineHeight: 1.1,
        maxWidth: '100%'
    },
    // Gradientes (Mesmos do BaseNode)
    colorTrigger: { background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)' },
    colorMessage: { background: 'linear-gradient(135deg, #2196f3 0%, #1565c0 100%)' },
    colorMenu: { background: 'linear-gradient(135deg, #ff9800 0%, #e65100 100%)' },
    colorSwitch: { background: 'linear-gradient(135deg, #9c27b0 0%, #6a1b9a 100%)' },
    colorDatabase: { background: 'linear-gradient(135deg, #795548 0%, #4e342e 100%)' },
    colorFilter: { background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' },
    colorPipeline: { background: 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)' },
    colorKnowledge: { background: 'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)' },
    colorEnd: { background: 'linear-gradient(135deg, #f44336 0%, #c62828 100%)' },
    colorDefault: { background: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)' },
    colorTicket: { background: 'linear-gradient(135deg, #f06292 0%, #c2185b 100%)' }
}));

const onDragStart = (event, nodeType, label) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
};

const DraggableNode = ({ type, label, icon: Icon, colorClass }) => {
    const classes = useStyles();
    return (
        <div
            className={classes.nodeWrapper}
            onDragStart={(event) => onDragStart(event, type, label)}
            draggable
        >
            <div className={`${classes.nodeCard} ${classes[colorClass]}`}>
                <Icon className={classes.icon} />
            </div>
            <Typography className={classes.label}>{label}</Typography>
        </div>
    );
};

const NodesSidebar = () => {
    const classes = useStyles();

    return (
        <aside className={classes.sidebar}>
            <div style={{ marginBottom: '5px', fontWeight: 'bold', color: '#333', fontSize: '16px', paddingLeft: '4px' }}>
                Blocos Disponíveis
            </div>

            {/* Categoria: WhatsApp */}
            <div className={classes.categoryTitle}>WhatsApp</div>
            <div className={classes.gridContainer}>
                <DraggableNode type="trigger" label="Gatilho" icon={TriggerIcon} colorClass="colorTrigger" />
                <DraggableNode type="message" label="Mensagem" icon={MessageIcon} colorClass="colorMessage" />
                <DraggableNode type="menu" label="Menu" icon={MenuIcon} colorClass="colorMenu" />
            </div>

            {/* Categoria: Lógica */}
            <div className={classes.categoryTitle}>Lógica</div>
            <div className={classes.gridContainer}>
                <DraggableNode type="input" label="Início" icon={PlayIcon} colorClass="colorTrigger" />
                <DraggableNode type="switch" label="Decisão" icon={SwitchIcon} colorClass="colorSwitch" />
                <DraggableNode type="output" label="Fim" icon={StopIcon} colorClass="colorEnd" />
            </div>

            {/* Categoria: Utilitários */}
            <div className={classes.categoryTitle}>Utilitários</div>
            <div className={classes.gridContainer}>
                <DraggableNode type="pipeline" label="Pipeline" icon={PipelineIcon} colorClass="colorPipeline" />
                <DraggableNode type="knowledge" label="IA" icon={KnowledgeIcon} colorClass="colorKnowledge" />
                <DraggableNode type="database" label="Database" icon={DatabaseIcon} colorClass="colorDatabase" />
                <DraggableNode type="filter" label="Filtro" icon={FilterIcon} colorClass="colorFilter" />
                <DraggableNode type="ticket" label="Ticket" icon={TicketIcon} colorClass="colorTicket" />
            </div>

            <div style={{ marginTop: 'auto', fontSize: '11px', color: '#999', textAlign: 'center', padding: '10px' }}>
                Arraste os ícones para o painel
            </div>
        </aside>
    );
};

export default NodesSidebar;
