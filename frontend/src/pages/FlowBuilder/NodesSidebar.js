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
    "@keyframes fadeInUp": {
        from: { opacity: 0, transform: 'translateY(10px)' },
        to: { opacity: 1, transform: 'translateY(0)' }
    },
    sidebar: {
        width: '280px',
        padding: '24px 20px',
        borderRight: '1px solid rgba(0,0,0,0.04)',
        background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        ...theme.scrollbarStyles,
    },
    categoryTitle: {
        marginTop: '28px',
        marginBottom: '16px',
        fontWeight: 700,
        color: '#374151',
        fontSize: '0.725rem',
        textTransform: 'uppercase',
        letterSpacing: '0.075em',
        opacity: 0.8,
        paddingLeft: '4px',
        borderLeft: '2px solid #e5e7eb'
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
        animation: '$fadeInUp 0.4s ease backwards',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
            transform: 'translateY(-2px)'
        },
        '&:active': {
            cursor: 'grabbing'
        }
    },
    nodeCard: {
        width: 52,
        height: 52,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.12)',
        marginBottom: 8,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid rgba(255,255,255,0.2)',
        "&:hover": {
            boxShadow: '0 12px 24px -8px rgba(0,0,0,0.2)',
            transform: 'translateY(-2px)'
        }
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

const DraggableNode = ({ type, label, icon: Icon, colorClass, index = 0 }) => {
    const classes = useStyles();
    return (
        <div
            className={classes.nodeWrapper}
            onDragStart={(event) => onDragStart(event, type, label)}
            draggable
            style={{ animationDelay: `${index * 50}ms` }}
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
            <div style={{ marginBottom: '8px', fontWeight: 800, color: '#111827', fontSize: '1.1rem', paddingLeft: '4px', letterSpacing: '-0.02em' }}>
                Flow Blocks
            </div>
            <Typography style={{ fontSize: '0.8rem', color: '#6b7280', paddingLeft: '4px', marginBottom: '12px' }}>
                Construa sua automação arrastando os componentes.
            </Typography>

            {/* Categoria: WhatsApp */}
            <div className={classes.categoryTitle}>WhatsApp</div>
            <div className={classes.gridContainer}>
                <DraggableNode type="trigger" label="Gatilho" icon={TriggerIcon} colorClass="colorTrigger" index={0} />
                <DraggableNode type="message" label="Mensagem" icon={MessageIcon} colorClass="colorMessage" index={1} />
                <DraggableNode type="menu" label="Menu" icon={MenuIcon} colorClass="colorMenu" index={2} />
            </div>

            {/* Categoria: Lógica */}
            <div className={classes.categoryTitle}>Lógica</div>
            <div className={classes.gridContainer}>
                <DraggableNode type="input" label="Início" icon={PlayIcon} colorClass="colorTrigger" index={3} />
                <DraggableNode type="switch" label="Decisão" icon={SwitchIcon} colorClass="colorSwitch" index={4} />
                <DraggableNode type="output" label="Fim" icon={StopIcon} colorClass="colorEnd" index={5} />
            </div>

            {/* Categoria: Utilitários */}
            <div className={classes.categoryTitle}>Utilitários</div>
            <div className={classes.gridContainer}>
                <DraggableNode type="pipeline" label="Pipeline" icon={PipelineIcon} colorClass="colorPipeline" index={6} />
                <DraggableNode type="knowledge" label="Conhecimento" icon={KnowledgeIcon} colorClass="colorKnowledge" index={7} />
                <DraggableNode type="database" label="Database" icon={DatabaseIcon} colorClass="colorDatabase" index={8} />
                <DraggableNode type="filter" label="Filtro" icon={FilterIcon} colorClass="colorFilter" index={9} />
                <DraggableNode type="ticket" label="Ticket" icon={TicketIcon} colorClass="colorTicket" index={10} />
                <DraggableNode type="webhook" label="Webhook" icon={HttpIcon} colorClass="colorWebhook" index={11} />
                <DraggableNode type="api" label="API" icon={ApiIcon} colorClass="colorApi" index={12} />
            </div>

            {/* Categoria: Helpdesk (Condicional) */}
            {helpdeskEnabled && (
                <>
                    <div className={classes.categoryTitle}>Helpdesk</div>
                    <div className={classes.gridContainer}>
                        <DraggableNode type="helpdesk" label="Protocolo" icon={HelpdeskIcon} colorClass="colorHelpdesk" index={13} />
                    </div>
                </>
            )}

            <div style={{ marginTop: '40px', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', padding: '16px', borderTop: '1px dashed #e5e7eb' }}>
                Versão 2.0 Premium UI
            </div>
        </aside>
    );
};

export default NodesSidebar;
