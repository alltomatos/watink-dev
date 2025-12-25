import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    getConnectedEdges
} from 'reactflow';
import 'reactflow/dist/style.css';

import { makeStyles } from '@material-ui/core/styles';
import { Paper, IconButton, Tooltip, Button, CircularProgress } from '@material-ui/core';
import { 
    Chat as ChatIcon, 
    ChevronRight as ChevronRightIcon, 
    Save as SaveIcon,
    CloudDownload as ImportIcon,
    CloudUpload as ExportIcon,
    CheckCircle as CheckIcon
} from '@material-ui/icons';
import { toast } from 'react-toastify';

import api from '../../services/api';
import ContentModal from './ContentModal';
import StartNodeModal from './StartNodeModal';
import NodesSidebar from './NodesSidebar';
import FlowChat from './FlowChat';

// Custom Nodes
import StartNode from './CustomNodes/StartNode';
import EndNode from './CustomNodes/EndNode';
import SwitchNode from './CustomNodes/SwitchNode';
import TriggerNode from './CustomNodes/TriggerNode';
import PipelineNode from './CustomNodes/PipelineNode';
import KnowledgeNode from './CustomNodes/KnowledgeNode';
import MessageNode from './CustomNodes/MessageNode';
import MenuNode from './CustomNodes/MenuNode';

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden'
    },
    flowPane: {
        flexGrow: 1,
        height: '100%',
        position: 'relative'
    },
    sidebar: {
        width: 350,
        borderLeft: '1px solid #e0e0e0',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        transition: 'width 0.3s ease',
        position: 'relative'
    },
    sidebarCollapsed: {
        width: 0,
        border: 'none',
        overflow: 'hidden'
    },
    toggleButton: {
        position: 'absolute',
        top: 10,
        right: 20,
        zIndex: 15,
        backgroundColor: '#fff',
        boxShadow: '0px 2px 4px -1px rgb(0 0 0 / 20%)',
        '&:hover': {
            backgroundColor: '#eee',
        }
    },
    toolbar: {
        position: 'absolute',
        top: 10,
        right: 70, // Left of chat toggle
        zIndex: 15,
        display: 'flex',
        gap: '8px'
    },
    fileInput: {
        display: 'none'
    }
}));

const initialNodes = [
    { 
        id: '1', 
        position: { x: 250, y: 50 }, 
        data: { 
            label: 'Gatilho: Tempo', 
            triggerType: 'time' 
        }, 
        type: 'start' 
    },
];
const initialEdges = [];

let id = 0;
const getId = () => `dndnode_${id++}`;

const FlowBuilder = () => {
    const classes = useStyles();
    const { flowId } = useParams();
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const reactFlowWrapper = useRef(null);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const [contentModalOpen, setContentModalOpen] = useState(false);
    const [startModalOpen, setStartModalOpen] = useState(false);
    const [currentNodeId, setCurrentNodeId] = useState(null);
    const fileInputRef = useRef(null);

    // AutoSave Timer
    const saveTimeoutRef = useRef(null);

    const handleNodeDelete = useCallback((nodeId) => {
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    }, [setNodes, setEdges]);

    const handleContentModalOpen = (nodeId) => {
        setCurrentNodeId(nodeId);
        setContentModalOpen(true);
    };

    const handleStartModalOpen = (nodeId) => {
        setCurrentNodeId(nodeId);
        setStartModalOpen(true);
    };

    const handleStartNodeSave = (data) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === currentNodeId) {
                    const label = data.triggerType === 'time' 
                        ? 'Gatilho: Tempo' 
                        : `Gatilho: ${data.actionType === 'message' ? 'Msg Conexão' : data.actionType === 'kanban' ? 'Kanban' : 'Funil'}`;
                    
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...data,
                            label
                        }
                    };
                }
                return node;
            })
        );
    };

    const handleContentAdd = (type) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === currentNodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            contentType: type,
                            content: `Conteúdo: ${type}` // Placeholder, real implementation would ask for content details
                        },
                    };
                }
                return node;
            })
        );
    };

    const nodeTypes = useMemo(() => ({
        start: StartNode,
        input: StartNode,
        end: EndNode,
        output: EndNode,
        switch: SwitchNode,
        trigger: TriggerNode,
        pipeline: PipelineNode,
        knowledge: KnowledgeNode,
        message: MessageNode,
        menu: MenuNode
    }), []);

    useEffect(() => {
        if (flowId) {
            loadFlow(flowId);
        }
    }, [flowId]);

    // AutoSave Logic
    useEffect(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        // Skip autosave on initial load or if empty
        if (nodes.length === 0 && edges.length === 0) return;

        saveTimeoutRef.current = setTimeout(() => {
            handleSave(true); // silent save
        }, 5000); // 5 seconds debounce

        return () => clearTimeout(saveTimeoutRef.current);
    }, [nodes, edges]);

    const loadFlow = async (id) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/flows/${id}`);
            if (data.nodes) {
                const hydratedNodes = data.nodes.map(node => ({
                    ...node,
                    data: {
                        ...node.data,
                        onDelete: () => handleNodeDelete(node.id),
                        onEdit: () => handleContentModalOpen(node.id)
                    }
                }));
                setNodes(hydratedNodes);
            }
            if (data.edges) setEdges(data.edges);
        } catch (err) {
            toast.error("Erro ao carregar fluxo");
        }
        setLoading(false);
    };

    const handleSave = async (silent = false) => {
        try {
            await api.put(`/flows/${flowId}`, {
                nodes,
                edges
            });
            if (!silent) toast.success("Fluxo salvo com sucesso!");
        } catch (err) {
            if (!silent) toast.error("Erro ao salvar fluxo");
        }
    };

    const validateFlow = () => {
        // Exemplo simples de validação: Verificar nós desconectados
        const connectedEdges = getConnectedEdges(nodes, edges);
        const unconnectedNodes = nodes.filter(
            node => !connectedEdges.find(edge => edge.source === node.id || edge.target === node.id)
        );

        if (unconnectedNodes.length > 0) {
            toast.warning(`Atenção: Existem ${unconnectedNodes.length} nós desconectados.`);
            return false;
        }

        toast.success("Fluxo validado! Todas as conexões parecem corretas.");
        return true;
    };

    const handleExport = () => {
        const flowData = { nodes, edges };
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
            JSON.stringify(flowData)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `flow_${flowId}.json`;
        link.click();
    };

    const handleImport = (event) => {
        const fileReader = new FileReader();
        fileReader.readAsText(event.target.files[0], "UTF-8");
        fileReader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (parsed.nodes && parsed.edges) {
                    setNodes(parsed.nodes);
                    setEdges(parsed.edges);
                    toast.success("Fluxo importado com sucesso!");
                } else {
                    toast.error("Arquivo de fluxo inválido");
                }
            } catch (err) {
                toast.error("Erro ao ler arquivo");
            }
        };
    };

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/reactflow/label');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowWrapper.current.getBoundingClientRect();
            const nodeId = getId();
            const newNode = {
                id: nodeId,
                type,
                position: {
                    x: event.clientX - position.left - 100,
                    y: event.clientY - position.top,
                },
                data: { 
                    label: `${label}`,
                    onEdit: () => handleContentModalOpen(nodeId),
                    onDelete: () => handleNodeDelete(nodeId)
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [setNodes]
    );

    const onNodeDoubleClick = useCallback((event, node) => {
        if (node.type === 'message') {
            handleContentModalOpen(node.id);
        } else if (node.type === 'start' || node.id === '1') {
             handleStartModalOpen(node.id);
        } else if (node.data && node.data.onEdit) {
            node.data.onEdit();
        }
    }, []);

    const handleAIResponse = (newNodes, newEdges) => {
        if (newNodes && newEdges) {
            setNodes(newNodes);
            setEdges(newEdges);
        }
    };

    return (
        <div className={classes.root}>
            <NodesSidebar />

            <div className={classes.flowPane} ref={reactFlowWrapper}>
                <ReactFlowProvider>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onNodeDoubleClick={onNodeDoubleClick}
                        fitView
                    >
                        <Controls />
                        <Background color="#aaa" gap={16} />

                        <div className={classes.toolbar}>
                            <input
                                accept=".json"
                                className={classes.fileInput}
                                id="import-flow-file"
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImport}
                            />
                            
                            <Tooltip title="Validar Fluxo">
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    size="small"
                                    onClick={validateFlow}
                                    style={{ backgroundColor: '#4caf50', color: '#fff' }}
                                >
                                    <CheckIcon />
                                </Button>
                            </Tooltip>

                            <Tooltip title="Importar JSON">
                                <Button
                                    variant="contained"
                                    color="default"
                                    size="small"
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    <ImportIcon />
                                </Button>
                            </Tooltip>

                            <Tooltip title="Exportar JSON">
                                <Button
                                    variant="contained"
                                    color="default"
                                    size="small"
                                    onClick={handleExport}
                                >
                                    <ExportIcon />
                                </Button>
                            </Tooltip>

                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={<SaveIcon />}
                                onClick={() => handleSave(false)}
                            >
                                Salvar
                            </Button>
                        </div>

                        {!isChatOpen && (
                            <Tooltip title="Abrir Chat IA">
                                <IconButton
                                    className={classes.toggleButton}
                                    onClick={() => setIsChatOpen(true)}
                                    size="small"
                                >
                                    <ChatIcon color="primary" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </ReactFlow>
                </ReactFlowProvider>
            </div>

            <Paper className={`${classes.sidebar} ${!isChatOpen ? classes.sidebarCollapsed : ''}`} square elevation={3}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '5px' }}>
                    <IconButton onClick={() => setIsChatOpen(false)} size="small">
                        <ChevronRightIcon />
                    </IconButton>
                </div>
                <FlowChat onFlowGenerated={handleAIResponse} />
            </Paper>

            <ContentModal 
                open={contentModalOpen} 
                onClose={() => setContentModalOpen(false)} 
                onAdd={handleContentAdd}
            />
            
            <StartNodeModal
                open={startModalOpen}
                onClose={() => setStartModalOpen(false)}
                onSave={handleStartNodeSave}
                initialData={nodes.find(n => n.id === currentNodeId)?.data}
            />
        </div>
    );
};

export default FlowBuilder;
