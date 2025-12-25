import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { makeStyles } from "@material-ui/core/styles";
import {
    Paper,
    Typography,
    Button,
    IconButton,
    Card,
    CardContent,
    CardActions
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";

import api from "../../services/api";
import { toast } from "react-toastify";

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
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        overflow: 'hidden'
    },
    columnHeader: {
        padding: theme.spacing(2),
        fontWeight: "bold",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
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
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
        }
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
        color: "#666"
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        color: '#fff',
        padding: '2px 8px',
        borderRadius: 12,
        fontWeight: 600,
        fontSize: '0.75rem'
    }
}));

// Paleta de cores modernas para colunas do Kanban
const stageColors = [
    { bg: '#e3f2fd', header: '#1976d2', light: '#bbdefb' }, // Azul
    { bg: '#fff3e0', header: '#f57c00', light: '#ffe0b2' }, // Laranja
    { bg: '#e8f5e9', header: '#388e3c', light: '#c8e6c9' }, // Verde
    { bg: '#fce4ec', header: '#c2185b', light: '#f8bbd9' }, // Rosa
    { bg: '#ede7f6', header: '#7b1fa2', light: '#d1c4e9' }, // Roxo
    { bg: '#e0f7fa', header: '#0097a7', light: '#b2ebf2' }, // Ciano
    { bg: '#fff8e1', header: '#ffa000', light: '#ffecb3' }, // Âmbar
    { bg: '#f3e5f5', header: '#8e24aa', light: '#e1bee7' }, // Violeta
    { bg: '#e8eaf6', header: '#3f51b5', light: '#c5cae9' }, // Índigo
    { bg: '#ffebee', header: '#d32f2f', light: '#ffcdd2' }, // Vermelho
];

const getStageColor = (index) => stageColors[index % stageColors.length];

const PipelineBoard = () => {
    const classes = useStyles();
    const { pipelineId } = useParams();
    const [pipeline, setPipeline] = useState(null);
    const [columns, setColumns] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPipelineData();
    }, [pipelineId]);

    const fetchPipelineData = async () => {
        try {
            const { data } = await api.get(`/pipelines`);
            // Filter manually since simple list service might not support GET /pipelines/:id directly yet
            // Or if updating ListPipelineService to return specific structured data.
            // For now, let's assume we find it in the list or fetch stages separately.

            const selectedPipeline = data.find(p => p.id === Number(pipelineId));

            if (selectedPipeline) {
                setPipeline(selectedPipeline);

                // Fetch Deals for this pipeline (backend needs filter by pipelineId)
                const { data: dealData } = await api.get(`/deals`, {
                    params: { pipelineId }
                });

                // Group deals by stageId
                const stageMap = {};

                selectedPipeline.stages.forEach(stage => {
                    stageMap[stage.id] = {
                        ...stage,
                        items: dealData.deals.filter(d => d.stageId === stage.id)
                    };
                });

                setColumns(stageMap);
            }
            setLoading(false);
        } catch (err) {
            toast.error("Erro ao carregar pipeline");
            setLoading(false);
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        if (source.droppableId !== destination.droppableId) {
            const sourceColumn = columns[source.droppableId];
            const destColumn = columns[destination.droppableId];
            const sourceItems = [...sourceColumn.items];
            const destItems = [...destColumn.items];
            const [removed] = sourceItems.splice(source.index, 1);

            // Speculatively update UI
            destItems.splice(destination.index, 0, removed);

            setColumns({
                ...columns,
                [source.droppableId]: { ...sourceColumn, items: sourceItems },
                [destination.droppableId]: { ...destColumn, items: destItems }
            });

            // API Call to update deal stage
            try {
                await api.put(`/deals/${draggableId}`, {
                    stageId: Number(destination.droppableId), // droppableId is stageId
                    pipelineId: Number(pipelineId)
                });
            } catch (err) {
                toast.error("Erro ao mover card");
                // Revert UI changes (omitted for brevity, but ideal in prod)
                fetchPipelineData();
            }
        } else {
            // Reordering within same column (optional implementation)
            // For Kanban usually we just update order/priority if needed
        }
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className={classes.root} style={{ flexDirection: 'column', padding: 0 }}>
            <Paper square style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                <Typography variant="h6">{pipeline ? pipeline.name : "Carregando..."}</Typography>
                <Button
                    variant="outlined"
                    startIcon={<i className="fas fa-file-export" />} // Simple icon fallback or use MI icon
                    onClick={async () => {
                        try {
                            const { data } = await api.get(`/pipelines/export/${pipelineId}`);
                            const json = JSON.stringify(data, null, 2);
                            const blob = new Blob([json], { type: "application/json" });
                            const href = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = href;
                            link.download = `${data.name.replace(/\s+/g, '_')}_pipeline.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        } catch (err) {
                            toast.error("Erro ao exportar");
                        }
                    }}
                >
                    Exportar
                </Button>
            </Paper>
            <div style={{ display: 'flex', flexGrow: 1, overflowX: 'auto', padding: 16 }}>
                <DragDropContext onDragEnd={onDragEnd}>
                    {pipeline && pipeline.stages.map((stage, stageIndex) => {
                        // We need to ensure we use the columns state which has the items
                        const columnData = columns[stage.id];
                        if (!columnData) return null;
                        const color = getStageColor(stageIndex);

                        return (
                            <div
                                key={stage.id}
                                className={classes.column}
                                style={{ backgroundColor: color.bg }}
                            >
                                <div
                                    className={classes.columnHeader}
                                    style={{ backgroundColor: color.header }}
                                >
                                    {stage.name}
                                    <span className={classes.badge}>{columnData.items.length}</span>
                                </div>
                                <Droppable droppableId={String(stage.id)} key={stage.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={classes.droppableArea}
                                            style={{
                                                background: snapshot.isDraggingOver ? color.light : color.bg
                                            }}
                                        >
                                            {columnData.items.map((item, index) => (
                                                <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                                                    {(provided, snapshot) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={classes.card}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                opacity: snapshot.isDragging ? 0.8 : 1
                                                            }}
                                                        >
                                                            <CardContent className={classes.cardContent}>
                                                                <Typography className={classes.cardTitle}>{item.title}</Typography>
                                                                <Typography className={classes.cardValue}>
                                                                    {item.contact?.name || "Sem contato"} - R$ {item.value || "0,00"}
                                                                </Typography>
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </Draggable>
                                            ))}
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
        </div>
    );
};

export default PipelineBoard;
