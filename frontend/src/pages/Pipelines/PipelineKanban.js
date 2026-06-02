/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { makeStyles } from "@material-ui/core/styles";
import {
    Paper,
    Typography,
    Button,
    Card,
    CardContent,
    Chip
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import api from "../../services/api";
import { toast } from "react-toastify";
import { differenceInDays, parseISO } from "date-fns";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexGrow: 1,
        overflowX: "auto",
        height: "100%",
        padding: theme.spacing(2)
    },
    column: {
        minWidth: 300,
        width: 300,
        marginRight: theme.spacing(2),
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        boxShadow: '0 1px 3px var(--border-divider), 0 1px 2px var(--overlay-dark)',
        overflow: 'hidden',
        backgroundColor: 'var(--border-default)' // Grey background for default
    },
    columnEnterprise: {
        backgroundColor: 'var(--bg-surface-alt)', // Slightly lighter
    },
    columnHeader: {
        padding: theme.spacing(2),
        fontWeight: "bold",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: 'var(--bg-surface)',
        textShadow: '0 1px 2px var(--overlay-dark)'
    },
    columnHeaderEnterprise: {
        padding: theme.spacing(2),
        fontWeight: "bold",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        borderTopWidth: 4,
        borderTopStyle: 'solid',
        borderBottom: '1px solid var(--border-default)',
        textShadow: 'none'
    },
    columnSubHeader: {
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        marginTop: 4,
        fontWeight: 'normal'
    },
    droppableArea: {
        padding: theme.spacing(1),
        flexGrow: 1,
        overflowY: "auto",
        minHeight: 100
    },
    card: {
        marginBottom: theme.spacing(1),
        backgroundColor: "white",
        borderRadius: 8,
        boxShadow: '0 1px 2px var(--shadow-appbar)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px var(--shadow-strong)'
        },
        position: 'relative'
    },
    cardContent: {
        padding: theme.spacing(1, 2),
        "&:last-child": {
            paddingBottom: theme.spacing(1)
        }
    },
    cardTitle: {
        fontWeight: "bold",
        fontSize: "0.9rem"
    },
    cardValue: {
        fontSize: "0.8rem",
        color: "var(--text-muted)"
    },
    badge: {
        backgroundColor: 'var(--overlay-light)',
        color: 'var(--bg-surface)',
        padding: '2px 8px',
        borderRadius: 12,
        fontWeight: 600,
        fontSize: '0.75rem'
    },
    badgeEnterprise: {
        backgroundColor: 'var(--border-default)',
        color: 'var(--text-primary)',
        padding: '2px 8px',
        borderRadius: 12,
        fontWeight: 600,
        fontSize: '0.75rem'
    },
    stagnantCard: {
        borderLeft: '4px solid var(--status-error)' // Red indicator
    },
    valueBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'var(--status-success-bg)',
        color: 'var(--status-success)',
        fontSize: '0.7rem',
        padding: '2px 6px',
        borderRadius: 4,
        fontWeight: 'bold'
    }
}));

const stageColors = [
    { bg: 'var(--status-info-bg)', header: 'var(--status-info)', light: 'var(--status-info-8)' },
    { bg: 'var(--bg-surface)3e0', header: 'var(--status-warning)', light: 'var(--status-warning-bg)' },
    { bg: 'var(--status-success-bg)', header: 'var(--status-success)', light: 'var(--status-success-10)' },
    { bg: 'var(--status-error-bg)', header: 'var(--status-error)', light: 'var(--status-error-10)' },
    { bg: 'var(--status-default-bg)', header: 'var(--status-default-text)', light: 'var(--status-default-bg)' },
    { bg: 'var(--status-info-bg)', header: 'var(--status-info)', light: 'var(--status-info-8)' },
    { bg: 'var(--bg-surface)8e1', header: 'var(--status-warning)', light: 'var(--status-warning-bg)' },
    { bg: 'var(--status-default-bg)', header: 'var(--status-default-text)', light: 'var(--status-default-bg)' },
    { bg: 'var(--status-info-bg)', header: 'var(--status-info)', light: 'var(--status-info-15)' },
    { bg: 'var(--status-error-bg)', header: 'var(--status-error)', light: 'var(--status-error-10)' },
];

const getStageColor = (index) => stageColors[index % stageColors.length];

const PipelineKanban = ({ pipeline, columns, setColumns, onDragEnd, isEnterprise = false }) => {
    const classes = useStyles();

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const calculateTotal = (items) => {
        return items.reduce((acc, item) => acc + (parseFloat(item.value) || 0), 0);
    };

    return (
        <div className={classes.root}>
            <DragDropContext onDragEnd={onDragEnd}>
                {pipeline && pipeline.stages.map((stage, stageIndex) => {
                    const columnData = columns[stage.id];
                    if (!columnData) return null;
                    const color = getStageColor(stageIndex);
                    const totalValue = calculateTotal(columnData.items);

                    return (
                        <div
                            key={stage.id}
                            className={`${classes.column} ${isEnterprise ? classes.columnEnterprise : ''}`}
                            style={{
                                backgroundColor: isEnterprise ? 'var(--bg-surface-alt)' : color.bg
                            }}
                        >
                            {isEnterprise ? (
                                <div
                                    className={classes.columnHeaderEnterprise}
                                    style={{ borderTopColor: color.header }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        {stage.name}
                                        <span className={classes.badgeEnterprise}>{columnData.items.length}</span>
                                    </div>
                                    <div className={classes.columnSubHeader}>
                                        Total: {formatCurrency(totalValue)}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={classes.columnHeader}
                                    style={{ backgroundColor: color.header }}
                                >
                                    {stage.name}
                                    <span className={classes.badge}>{columnData.items.length}</span>
                                </div>
                            )}

                            <Droppable droppableId={String(stage.id)} key={stage.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={classes.droppableArea}
                                        style={{
                                            background: isEnterprise
                                                ? (snapshot.isDraggingOver ? 'var(--status-info-bg)' : 'transparent')
                                                : (snapshot.isDraggingOver ? color.light : color.bg)
                                        }}
                                    >
                                        {columnData.items.map((item, index) => {
                                            const isStagnant = isEnterprise && item.updatedAt && differenceInDays(new Date(), parseISO(item.updatedAt)) > 7;

                                            return (
                                                <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                                                    {(provided, snapshot) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`${classes.card} ${isStagnant ? classes.stagnantCard : ''}`}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                opacity: snapshot.isDragging ? 0.8 : 1
                                                            }}
                                                        >
                                                            <CardContent className={classes.cardContent}>
                                                                {isEnterprise && (
                                                                    <div className={classes.valueBadge}>
                                                                        {formatCurrency(item.value || 0)}
                                                                    </div>
                                                                )}
                                                                <Typography className={classes.cardTitle} style={{ paddingRight: isEnterprise ? 60 : 0 }}>
                                                                    {item.title}
                                                                </Typography>
                                                                <Typography className={classes.cardValue}>
                                                                    {item.contact?.name || "Sem contato"}
                                                                </Typography>
                                                                {!isEnterprise && (
                                                                    <Typography className={classes.cardValue}>
                                                                        R$ {item.value || "0,00"}
                                                                    </Typography>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                            <Button startIcon={<AddIcon />} fullWidth>
                                Novo Deal
                            </Button>
                        </div>
                    );
                })}
            </DragDropContext>
        </div>
    );
};

export default PipelineKanban;
