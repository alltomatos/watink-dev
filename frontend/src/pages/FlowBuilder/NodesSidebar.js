/* @jsxImportSource react */
import React, { useState, useEffect } from 'react';
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
    Storage as DatabaseIcon,
    FilterList as FilterIcon,
    ConfirmationNumber as TicketIcon,
    Explicit as EndIcon,
    Http as HttpIcon,
    LibraryBooks as KnowledgeIcon,
    Language as ApiIcon,
    Assignment as HelpdeskIcon
} from '@material-ui/icons';
import api from '../../services/api';

const useStyles = makeStyles((theme) => ({
    sidebar: {
        width: '280px',
        padding: '20px',
        borderRight: '1px solid rgba(0,0,0,0.05)',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
        ...theme.scrollbarStyles,
    },
    categoryTitle: {
        marginTop: '20px',
        marginBottom: '12px',
        fontWeight: 700,
        color: '#1a1a1a',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        opacity: 0.6
    },
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
    },
    // Estilos do Card
    nodeWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'grab',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
            transform: 'translateY(-2px)'
        },
        '&:active': {
            cursor: 'grabbing'
        }
    },
    nodeCard: {
        width: 48,
        height: 48,
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        marginBottom: 8,
        transition: 'all 0.2s ease',
    },
    icon: {
        fontSize: 24,
        color: '#fff'
    },
    label: {
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: '100%'
    },
    // Apple-like gradients
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
    colorHelpdesk: { background: 'linear-gradient(180deg, #00C7BE 0%, #00A39C 100%)' }
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
    const [helpdeskEnabled, setHelpdeskEnabled] = useState(false);

    useEffect(() => {
        const checkHelpdeskPlugin = async () => {
            try {
                // Verificar plugins instalados/ativos
                const { data } = await api.get('/v1/plugins/installed');
                // API retorna { active: ["slug1", "slug2"] } - array de strings
                const activePlugins = data.active || [];
                // Verificar se 'helpdesk' está na lista de plugins ativos
                if (activePlugins.includes('helpdesk')) {
                    setHelpdeskEnabled(true);
                }
            } catch (err) {
                console.error('Error checking helpdesk plugin status', err);
            }
        };
        checkHelpdeskPlugin();
    }, []);

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
                <DraggableNode type="knowledge" label="Conhecimento" icon={KnowledgeIcon} colorClass="colorKnowledge" />
                <DraggableNode type="database" label="Database" icon={DatabaseIcon} colorClass="colorDatabase" />
                <DraggableNode type="filter" label="Filtro" icon={FilterIcon} colorClass="colorFilter" />
                <DraggableNode type="ticket" label="Ticket" icon={TicketIcon} colorClass="colorTicket" />
                <DraggableNode type="webhook" label="Webhook" icon={HttpIcon} colorClass="colorWebhook" />
                <DraggableNode type="api" label="API" icon={ApiIcon} colorClass="colorApi" />
            </div>

            {/* Categoria: Helpdesk (Condicional) */}
            {helpdeskEnabled && (
                <>
                    <div className={classes.categoryTitle}>Helpdesk</div>
                    <div className={classes.gridContainer}>
                        <DraggableNode type="helpdesk" label="Protocolo" icon={HelpdeskIcon} colorClass="colorHelpdesk" />
                    </div>
                </>
            )}

            <div style={{ marginTop: 'auto', fontSize: '11px', color: '#999', textAlign: 'center', padding: '10px' }}>
                Arraste os ícones para o painel
            </div>
        </aside>
    );
};

export default NodesSidebar;
